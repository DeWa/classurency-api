import { ForbiddenException, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { BlockchainService, TransactionBlockchainPayload } from '@common/blockchain/blockchain.service';
import { Account } from '@modules/accounts/account.entity';
import { AccountsService } from '@modules/accounts/accounts.service';
import { ItemsService } from '@modules/items/items.service';
import { Item } from '@modules/items/item.entity';
import { ApiAuthContext } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { Transaction } from './transaction.entity';
import { TransferDto } from './dto/transfer.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';

/** Default number of transactions returned when the client omits the limit query parameter. */
export const DEFAULT_ACCOUNT_TRANSACTIONS_LIMIT = 10;
/** Maximum allowed limit for account transaction list queries. */
export const MAX_ACCOUNT_TRANSACTIONS_LIMIT = 100;

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

  private async findPayerAccountIdByNfcCardUid(requesterUserId: string, nfcCardUid: string): Promise<string> {
    const payerAccount = await this.accountsRepo.findOne({
      where: { nfcCardUid },
    });
    if (!payerAccount) {
      throw new BadRequestException('Payer account not found');
    }
    if (payerAccount.userId !== requesterUserId) {
      throw new BadRequestException('Payer account does not belong to the requester');
    }
    return payerAccount.id;
  }

  private async findPayerAccountIdByCardKey(
    requesterUserId: string,
    encryptedPrivateKeyFromCard: string,
  ): Promise<string> {
    const privateKeyHex = this.cryptoService.decryptCardPrivateKey(encryptedPrivateKeyFromCard);
    const derivedPublicKeyHex = this.cryptoService.publicKeyFromPrivateKeyHex(privateKeyHex);
    const payerAccount = await this.accountsRepo.findOne({
      where: { userId: requesterUserId, publicKeyHex: derivedPublicKeyHex },
    });
    if (!payerAccount) {
      throw new BadRequestException('Payer account not found');
    }
    return payerAccount.id;
  }

  /**
   * Lists transactions involving an account (payer, payee, or mint recipient). Allowed for the account owner or an admin.
   *
   * @param accountId - The account UUID.
   * @param auth - Authenticated API context.
   * @param limit - Requested number of transactions (clamped to a safe range).
   * @returns Transactions ordered by newest first.
   */
  async findTransactionsForAccount(
    accountId: string,
    auth: ApiAuthContext,
    limit: number,
  ): Promise<TransactionResponseDto[]> {
    const account = await this.accountsRepo.findOne({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const isAdmin = auth.privilege === ApiTokenPrivilege.ADMIN;
    if (!isAdmin && account.userId !== auth.userId) {
      throw new ForbiddenException("You are not allowed to view this account's transactions");
    }
    const cappedLimit = Math.min(Math.max(limit, 1), MAX_ACCOUNT_TRANSACTIONS_LIMIT);
    const rows = await this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.account', 'fromAccount')
      .leftJoinAndSelect('tx.toAccount', 'toAccount')
      .where('tx.accountId = :accountId OR tx.toAccountId = :accountId', { accountId })
      .orderBy('tx.createdAt', 'DESC')
      .limit(cappedLimit)
      .getMany();
    return rows.map((tx) => this.mapTransactionToResponse(tx));
  }

  /**
   * Maps a persisted transaction entity to the public API response shape.
   */
  mapTransactionToResponse(tx: Transaction): TransactionResponseDto {
    return {
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.description ?? null,
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
   * @param adminUserAccountId - The ID of the admin user's account who is minting the funds.
   * @returns
   */
  async mintToAccount(
    adminUserId: string,
    adminUserAccountId: string,
    accountId: string,
    amount: number,
    description?: string,
  ): Promise<{ balance: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const account = await this.accountsRepo.findOne({
      where: { id: accountId },
    });
    const adminUserAccount = await this.accountsRepo.findOne({
      where: { id: adminUserAccountId },
    });
    if (!account || !adminUserAccount) {
      throw new BadRequestException('Account or admin user account not found');
    }
    if (adminUserId !== adminUserAccount.userId) {
      throw new BadRequestException('Admin user account does not belong to the admin user');
    }

    await this.dataSource.transaction(async (manager) => {
      const newBalance = Number(account.balance) + amount;
      account.balance = newBalance;
      await manager.save(Account, account);

      const payload: TransactionBlockchainPayload = {
        kind: 'MINT',
        from: adminUserAccount.id,
        to: account.id,
        amount,
        description: description ?? undefined,
        timestamp: Date.now(),
      };
      const adminAccountPrivateKey = this.cryptoService.decryptCardPrivateKey(account.encryptedPrivateKey);
      const signature = this.cryptoService.signPayload(adminAccountPrivateKey, payload);
      const txHash = this.blockchainService.computeTxHash(payload, signature);
      const block = await this.blockchainService.appendBlockForTxHash(txHash, manager);

      const tx = manager.create(Transaction, {
        account: undefined,
        toAccount: account,
        amount: amount,
        type: 'MINT',
        txHash,
        block,
        blockchainSignature: signature,
        description: description ?? undefined,
      });
      await manager.save(Transaction, tx);
    });

    return { balance: Number(account.balance).toFixed(2) };
  }

  async transfer(transferData: TransferDto, apiAuth: ApiAuthContext, ipAddress: string): Promise<Transaction> {
    const payerAccountId = await this.findPayerAccountIdByNfcCardUid(apiAuth.userId, transferData.nfcCardUid);
    return this.transferToAccount({
      requesterUserId: apiAuth.userId,
      fromAccountId: payerAccountId,
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
    const payerAccountId = payerAccount.id;

    if (transactionManager) {
      return this.performTransferToAccount(
        {
          payerAccountId,
          toAccountId,
          amount,
          description,
        },
        manager,
      );
    }

    return manager.transaction(async (transactionalManager) => {
      return this.performTransferToAccount(
        {
          payerAccountId,
          toAccountId,
          amount,
          description,
        },
        transactionalManager,
      );
    });
  }

  private async performTransferToAccount(
    params: {
      payerAccountId: string;
      toAccountId: string;
      amount: number;
      description?: string;
    },
    manager: EntityManager,
  ): Promise<Transaction> {
    const { payerAccountId, toAccountId, amount, description } = params;

    const payerLocked = await manager.findOne(Account, {
      where: { id: payerAccountId },
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

    const payload: TransactionBlockchainPayload = {
      kind: 'PURCHASE',
      from: payerLocked.id,
      to: recipientLocked.id,
      amount,
      description: description ?? undefined,
      timestamp: Date.now(),
    };

    const privateKeyHex = this.cryptoService.decryptCardPrivateKey(payerLocked.encryptedPrivateKey);
    const signature = this.cryptoService.signPayload(privateKeyHex, payload);
    const txHash = this.blockchainService.computeTxHash(payload, signature);

    const block = await this.blockchainService.appendBlockForTxHash(txHash, manager);

    payerLocked.balance = currentBalance - amount;
    recipientLocked.balance = Number(recipientLocked.balance) + amount;

    const tx = manager.create(Transaction, {
      account: payerLocked,
      toAccount: recipientLocked,
      amount: amount,
      type: 'PURCHASE',
      txHash,
      block,
      blockchainSignature: signature,
      description: description ?? undefined,
    });
    await manager.save(Transaction, tx);

    // Update the accounts
    await manager.save(Account, payerLocked);
    await manager.save(Account, recipientLocked);

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
    const uniqueItemIds = Array.from(new Set(itemIds));
    const quantityByItemId: Record<string, number> = {};
    for (const itemId of itemIds) {
      quantityByItemId[itemId] = (quantityByItemId[itemId] ?? 0) + 1;
    }

    const items = await this.itemsService.findByIds(uniqueItemIds);
    const itemById = new Map(items.map((item) => [item.id, item]));

    if (items.length !== uniqueItemIds.length) {
      const missingItemIds = uniqueItemIds.filter((itemId) => !itemById.has(itemId));
      throw new BadRequestException(`Items not found: ${missingItemIds.join(', ')}`);
    }

    // If any tracked items are out of stock, return an error early.
    for (const item of items) {
      if (item.amount === null) {
        continue;
      }

      const howManyPurchased = quantityByItemId[item.id] ?? 0;
      if (item.amount < howManyPurchased) {
        throw new BadRequestException(`Item ${item.name} is out of stock. Only ${item.amount} left.`);
      }
    }

    const payerAccountId = await this.findPayerAccountIdByCardKey(
      requesterUserId,
      accountData.encryptedPrivateKeyFromCard,
    );

    const purchasedItemNames = itemIds
      .map((itemId) => itemById.get(itemId)?.name)
      .filter((name): name is string => Boolean(name));

    const { tx, itemAmounts } = await this.dataSource.manager.transaction(
      async (manager): Promise<{ tx: Transaction; itemAmounts: Record<string, number> }> => {
        const totalValue = items.reduce((acc, item) => {
          const qty = quantityByItemId[item.id] ?? 0;
          return acc + item.value * qty;
        }, 0);

        const descriptionWithItems = description
          ? `${description} - ${purchasedItemNames.join(', ')}`
          : purchasedItemNames.join(', ');

        const tx = await this.transferToAccount(
          {
            requesterUserId,
            fromAccountId: payerAccountId,
            toAccountId: providerAccountId,
            amount: totalValue,
            description: descriptionWithItems,
            pin: accountData.pin,
            encryptedPrivateKeyFromCard: accountData.encryptedPrivateKeyFromCard,
            ipAddress,
          },
          manager,
        );

        const itemAmounts: Record<string, number> = {};

        for (const item of items) {
          const howManyPurchased = quantityByItemId[item.id] ?? 0;
          if (howManyPurchased <= 0) {
            continue;
          }

          if (item.amount === null) {
            continue;
          }

          const lockedItem = await manager.findOne(Item, {
            where: { id: item.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!lockedItem) {
            throw new BadRequestException(`Item ${item.id} not found`);
          }

          if (lockedItem.amount === null) {
            continue;
          }

          if (lockedItem.amount < howManyPurchased) {
            throw new BadRequestException(`Item ${lockedItem.name} is out of stock. Only ${lockedItem.amount} left.`);
          }

          lockedItem.amount = lockedItem.amount - howManyPurchased;
          itemAmounts[lockedItem.id] = lockedItem.amount;
          await manager.save(Item, lockedItem);
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
