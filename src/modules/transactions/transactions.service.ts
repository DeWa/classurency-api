import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { BlockchainService } from '@common/blockchain/blockchain.service';
import { Account } from '@modules/accounts/account.entity';
import { AccountsService } from '@modules/accounts/accounts.service';
import { ItemsService } from '@modules/items/items.service';
import { ApiAuthContext } from '@common/guards/api-token.guard';
import { Transaction } from './transaction.entity';
import { TransferDto } from './dto/transfer.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountsRepo: Repository<Account>,
    private readonly cryptoService: CryptoService,
    private readonly blockchainService: BlockchainService,
    private readonly accountsService: AccountsService,
    private readonly itemsService: ItemsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lists transactions where the authenticated user is the payer, recipient, or mint recipient.
   *
   * @param userId - The ID of the user.
   * @param limit - The number of transactions to return.
   * @param offset - The offset of the transactions to return.
   * @returns Transactions ordered by newest first.
   */
  async findTransactionsForUser(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<TransactionResponseDto[]> {
    const rows = await this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.account', 'fromAccount')
      .leftJoinAndSelect('tx.toAccount', 'toAccount')
      .where('fromAccount.userId = :userId OR toAccount.userId = :userId', { userId })
      .limit(limit)
      .offset(offset)
      .orderBy('tx.createdAt', 'DESC')
      .getMany();
    return rows.map((tx) => this.mapTransactionToResponse(tx));
  }

  /**
   * Returns a transaction by id if the user is the payer or recipient (or mint recipient).
   *
   * @param transactionId - Primary key of the transaction.
   * @param userId - The ID of the requesting user.
   * @returns The transaction payload.
   */
  async findTransactionByIdForUser(transactionId: number, userId: string): Promise<TransactionResponseDto> {
    const tx = await this.transactionsRepo.findOne({
      where: { id: transactionId },
      relations: ['account', 'toAccount'],
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    const isUserFromAccount = tx.account?.userId === userId;
    const isUserToAccount = tx.toAccount?.userId === userId;
    if (!isUserFromAccount && !isUserToAccount) {
      throw new NotFoundException('Transaction not found');
    }
    return this.mapTransactionToResponse(tx);
  }

  /**
   * Maps a persisted transaction entity to the public API response shape.
   */
  mapTransactionToResponse(tx: Transaction): TransactionResponseDto {
    return {
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.description,
      createdAt: tx.createdAt,
      fromAccountId: tx.account?.id ?? null,
      toAccountId: tx.toAccount?.id ?? null,
    };
  }

  /**
   *
   * @param accountId - The ID of the account to mint to.
   * @param amount - The amount to mint.
   * @param description - The description of the mint transaction.
   * @returns
   */
  async mintToAccount(accountId: string, amount: number, description?: string): Promise<{ balance: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const account = await this.accountsRepo.findOne({
      where: { id: accountId },
    });
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    await this.dataSource.transaction(async (manager) => {
      const newBalance = Number(account.balance) + amount;
      account.balance = newBalance;
      await manager.save(Account, account);

      const payload = {
        kind: 'MINT',
        accountId: account.id,
        amount,
        description: description ?? null,
        timestamp: Date.now(),
      };
      const storedPrivateKey = this.cryptoService.decryptStoredPrivateKey(account.encryptedPrivateKey);
      const signature = this.cryptoService.signPayload(storedPrivateKey, payload);

      const txPayload = JSON.stringify(payload);
      const tx = manager.create(Transaction, {
        account: undefined,
        toAccount: account,
        amount: amount,
        type: 'MINT',
        description: description ?? null,
        blockchainPayload: txPayload,
        blockchainSignature: signature,
      });
      await manager.save(Transaction, tx);

      const txHash = this.blockchainService.computeTxHash(txPayload, signature);
      const block = await this.blockchainService.appendBlockForTxHash(txHash, manager);
      tx.block = block;
      await manager.save(Transaction, tx);
    });

    return { balance: Number(account.balance).toFixed(2) };
  }

  async transfer(transferData: TransferDto, apiAuth: ApiAuthContext, ipAddress: string): Promise<Transaction> {
    return this.transferToAccount({
      requesterUserId: apiAuth.userId,
      fromAccountId: undefined,
      toAccountId: transferData.toAccountId,
      amount: transferData.value,
      description: transferData.description,
      pin: transferData.pin,
      encryptedPrivateKeyFromCard: transferData.encryptedPrivateKeyFromCard,
      ipAddress,
    });
  }

  async transferToAccount(
    transferData: {
      requesterUserId: string;
      fromAccountId?: string;
      toAccountId: string;
      amount: number;
      description?: string;
      pin: string;
      encryptedPrivateKeyFromCard: string;
      ipAddress: string;
    },
    transactionManager?: EntityManager,
  ): Promise<Transaction> {
    const {
      requesterUserId,
      fromAccountId,
      toAccountId,
      amount,
      description,
      pin,
      encryptedPrivateKeyFromCard,
      ipAddress,
    } = transferData;
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (!fromAccountId) {
      throw new BadRequestException('Missing payer account');
    }

    let payerAccount: Account | null = null;
    if (fromAccountId) {
      payerAccount = await this.accountsRepo.findOne({
        where: { id: fromAccountId },
      });
    }

    if (!payerAccount) {
      throw new BadRequestException('Payer account not found');
    }
    if (payerAccount.userId !== requesterUserId) {
      throw new BadRequestException('Payer account does not belong to the requester');
    }

    const loginSuccessful = await this.accountsService.checkAccountLogin(
      payerAccount,
      pin,
      encryptedPrivateKeyFromCard,
      ipAddress,
    );
    if (!loginSuccessful) {
      throw new BadRequestException('Invalid credentials or account is locked');
    }

    const manager = transactionManager ?? this.dataSource.manager;

    const { tx } = await manager.transaction(async (manager) => {
      const payerLocked = await manager.findOne(Account, {
        where: { id: payerAccount.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payerLocked) {
        throw new BadRequestException('Payer account not found');
      }

      const recipientLocked = await manager.findOne(Account, {
        where: { id: toAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!recipientLocked) {
        throw new BadRequestException('Recipient account not found');
      }

      const currentBalance = Number(payerLocked.balance);
      if (currentBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      payerLocked.balance = currentBalance - amount;
      recipientLocked.balance = Number(recipientLocked.balance) + amount;

      await manager.save(Account, payerLocked);
      await manager.save(Account, recipientLocked);

      const payload = {
        kind: 'PURCHASE',
        fromUserId: payerLocked.id,
        toUserId: recipientLocked.id,
        amount,
        description: description ?? null,
        timestamp: Date.now(),
      };
      const txPayload = JSON.stringify(payload);

      const privateKeyHex = this.cryptoService.decryptCardPrivateKey(payerLocked.encryptedPrivateKey);
      const signature = this.cryptoService.signPayload(privateKeyHex, payload);

      const createdTx = manager.create(Transaction, {
        account: payerLocked,
        toAccount: recipientLocked,
        amount,
        type: 'PURCHASE',
        description: description ?? null,
        blockchainPayload: txPayload,
        blockchainSignature: signature,
      });
      await manager.save(Transaction, createdTx);

      return { tx: createdTx };
    });

    const txHash = this.blockchainService.computeTxHash(tx.blockchainPayload, tx.blockchainSignature);
    const block = await this.blockchainService.appendBlockForTxHash(txHash);
    tx.block = block;
    await this.dataSource.manager.save(Transaction, tx);

    return tx;
  }

  async purchaseItems(
    accountData: {
      pin: string;
      encryptedPrivateKeyFromCard: string;
    },
    itemIds: string[],
    providerAccountId: string,
    requesterUserId: string,
    ipAddress: string,
    description?: string,
  ): Promise<{
    transactionId: number;
    remainingAmount: Record<string, number>;
  }> {
    const items = await this.itemsService.findByIds(itemIds);

    // If any of the items are out of stock, return an error.
    for (const item of items) {
      // Item amount is not tracked
      if (item.amount === null) {
        continue;
      }
      const howManyPurchased = itemIds.filter((id) => id === item.id).length;

      if (item.amount < howManyPurchased) {
        throw new BadRequestException(`Item ${item.name} is out of stock. Only ${item.amount} left.`);
      }
    }

    const { tx, itemAmounts } = await this.dataSource.manager.transaction(
      async (manager): Promise<{ tx: Transaction; itemAmounts: Record<string, number> }> => {
        const totalValue = items.reduce((acc, item) => acc + item.value, 0);
        const descriptionWithItems = description
          ? `${description} - ${items.map((item) => item.name).join(', ')}`
          : items.map((item) => item.name).join(', ');
        const tx = await this.transferToAccount(
          {
            requesterUserId,
            toAccountId: providerAccountId,
            amount: totalValue,
            description: descriptionWithItems,
            pin: accountData.pin,
            encryptedPrivateKeyFromCard: accountData.encryptedPrivateKeyFromCard,
            ipAddress,
          },
          manager,
        );

        // Update item amounts
        const itemAmounts: Record<string, number> = {};

        for (const item of items) {
          // Item amount is not tracked
          if (item.amount === null) {
            continue;
          }
          const howManyPurchased = itemIds.filter((itemId) => itemId === item.id).length;
          const newAmount = item.amount - howManyPurchased;
          itemAmounts[item.id] = newAmount;
        }

        return { tx, itemAmounts };
      },
    );

    return {
      transactionId: tx.id,
      remainingAmount: itemAmounts,
    };
  }
}
