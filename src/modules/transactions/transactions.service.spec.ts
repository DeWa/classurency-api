import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Account } from '@modules/accounts/account.entity';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import type { ApiAuthContext } from '@common/guards/api-token.guard';
import type { AccountsService } from '@modules/accounts/accounts.service';
import type { BlockchainService } from '@common/blockchain/blockchain.service';
import type { CryptoService } from '@common/crypto/crypto.service';
import type { ItemsService } from '@modules/items/items.service';
import type { Item } from '@modules/items/item.entity';
import type { Repository, DataSource } from 'typeorm';
import { UserType } from '@modules/users/user.entity';
import type { Transaction } from './transaction.entity';
import type { TransactionsService as TransactionsServiceType } from './transactions.service';
import type { TransferDto as TransferDtoType } from './dto/transfer.dto';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

const {
  TransactionsService,
}: {
  TransactionsService: typeof import('./transactions.service').TransactionsService;
} = require('./transactions.service');

jest.mock('@common/crypto/crypto.service', () => ({
  CryptoService: class CryptoService {},
}));
jest.mock('@common/blockchain/blockchain.service', () => ({
  BlockchainService: class BlockchainService {},
  TransactionBlockchainPayload: {},
}));
jest.mock('@modules/accounts/accounts.service', () => ({
  AccountsService: class AccountsService {},
}));
jest.mock('@modules/items/items.service', () => ({
  ItemsService: class ItemsService {},
}));

describe('TransactionsService', () => {
  function createService(params: {
    accountsRepo: { findOne: jest.Mock };
    cryptoService: { decryptCardPrivateKey: jest.Mock; publicKeyFromPrivateKeyHex: jest.Mock };
    itemsService: { findByIds: jest.Mock };
    dataSource: { manager: { transaction: jest.Mock } };
    transactionsRepo?: Repository<Transaction>;
  }): TransactionsServiceType {
    const transactionsRepo = (params.transactionsRepo ?? {}) as unknown as Repository<Transaction>;
    const blockchainService = {} as unknown as BlockchainService;
    const accountsService = {} as unknown as AccountsService;

    return new TransactionsService(
      transactionsRepo,
      params.accountsRepo as unknown as Repository<Account>,
      params.cryptoService as unknown as CryptoService,
      blockchainService,
      accountsService,
      params.itemsService as unknown as ItemsService,
      params.dataSource as unknown as DataSource,
    );
  }

  describe('transfer()', () => {
    it('resolves fromAccountId from nfcCardUid', async () => {
      const payerAccount = { id: 'payer-account-id', userId: 'requester-user-id' };
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue(payerAccount),
      };
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };

      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource });
      const transferToAccountSpy = jest
        .spyOn(service, 'transferToAccount')
        .mockResolvedValue({ id: 123 } as unknown as Transaction);

      const dto: TransferDtoType = {
        nfcCardUid: 'card-uid',
        toAccountId: 'to-account-id',
        value: 2.5,
        description: 'Lunch',
        pin: '1234',
        encryptedPrivateKeyFromCard: 'encrypted-private-key',
      };
      const apiAuth: ApiAuthContext = {
        userId: 'requester-user-id',
        privilege: ApiTokenPrivilege.USER,
        userType: UserType.USER,
      };

      await service.transfer(dto, apiAuth, '127.0.0.1');

      expect(accountsRepo.findOne).toHaveBeenCalledWith({ where: { nfcCardUid: 'card-uid' } });
      expect(transferToAccountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterUserId: 'requester-user-id',
          fromAccountId: 'payer-account-id',
          toAccountId: 'to-account-id',
          amount: 2.5,
          description: 'Lunch',
          pin: '1234',
          encryptedPrivateKeyFromCard: 'encrypted-private-key',
          ipAddress: '127.0.0.1',
        }),
      );
    });

    it('throws if payer account is not found for nfcCardUid', async () => {
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };

      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource });

      const dto: TransferDtoType = {
        nfcCardUid: 'unknown-card-uid',
        toAccountId: 'to-account-id',
        value: 2.5,
        description: undefined,
        pin: '1234',
        encryptedPrivateKeyFromCard: 'encrypted-private-key',
      };
      const apiAuth: ApiAuthContext = {
        userId: 'requester-user-id',
        privilege: ApiTokenPrivilege.USER,
        userType: UserType.USER,
      };

      await expect(service.transfer(dto, apiAuth, '127.0.0.1')).rejects.toThrow('Payer account not found');
    });
  });

  describe('purchaseItems()', () => {
    it('computes totals from item quantity and persists stock decrements', async () => {
      const payerAccount = { id: 'payer-account-id', userId: 'requester-user-id' };
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue(payerAccount),
      };
      const cryptoService = {
        decryptCardPrivateKey: jest.fn().mockReturnValue('private-key-hex'),
        publicKeyFromPrivateKeyHex: jest.fn().mockReturnValue('derived-public-key-hex'),
      };

      const items = [
        {
          id: 'item-1',
          name: 'Item 1',
          value: 2.0,
          amount: 10,
        },
      ];
      const itemsService = {
        findByIds: jest.fn().mockResolvedValue(items),
      };

      const mockLockedItem = { ...items[0] } as unknown as Item;
      const mockManager: { findOne: jest.Mock; save: jest.Mock } = {
        findOne: jest.fn().mockResolvedValue(mockLockedItem),
        save: jest.fn().mockResolvedValue(mockLockedItem),
      };
      const dataSource = {
        manager: {
          transaction: jest.fn().mockImplementation((callback: (manager: unknown) => unknown) => callback(mockManager)),
        },
      };

      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource });
      const transferToAccountSpy = jest
        .spyOn(service, 'transferToAccount')
        .mockResolvedValue({ id: 999 } as unknown as Transaction);

      const result = await service.purchaseItems(
        {
          pin: '1234',
          encryptedPrivateKeyFromCard: 'encrypted-private-key',
        },
        ['item-1', 'item-1'],
        'provider-account-id',
        'requester-user-id',
        '127.0.0.1',
        undefined,
      );

      expect(result.transactionId).toBe(999);
      expect(result.remainingAmount).toEqual({ 'item-1': 8 });
      expect(mockManager.findOne).toHaveBeenCalledWith(expect.anything(), {
        where: { id: 'item-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.save).toHaveBeenCalled();
      expect(transferToAccountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterUserId: 'requester-user-id',
          fromAccountId: 'payer-account-id',
          toAccountId: 'provider-account-id',
          amount: 4.0,
        }),
        mockManager,
      );
    });
  });

  describe('findTransactionsForAccount()', () => {
    function mockQueryBuilder(getManyResult: Transaction[]) {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(getManyResult),
      };
      return qb;
    }

    it('throws NotFoundException when the account does not exist', async () => {
      const accountsRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const transactionsRepo = {
        createQueryBuilder: jest.fn(),
      } as unknown as Repository<Transaction>;
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };
      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource, transactionsRepo });
      const auth: ApiAuthContext = {
        userId: 'user-1',
        privilege: ApiTokenPrivilege.USER,
        userType: UserType.USER,
      };
      await expect(service.findTransactionsForAccount('missing-account-id', auth, 10)).rejects.toThrow(
        NotFoundException,
      );
      expect(transactionsRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the caller is not the owner and not admin', async () => {
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'acc-1', userId: 'owner-user-id' }),
      };
      const transactionsRepo = {
        createQueryBuilder: jest.fn(),
      } as unknown as Repository<Transaction>;
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };
      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource, transactionsRepo });
      const auth: ApiAuthContext = {
        userId: 'other-user-id',
        privilege: ApiTokenPrivilege.USER,
        userType: UserType.USER,
      };
      await expect(service.findTransactionsForAccount('acc-1', auth, 10)).rejects.toThrow(ForbiddenException);
      expect(transactionsRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns mapped transactions for the account owner', async () => {
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'acc-1', userId: 'owner-user-id' }),
      };
      const persistedTx = {
        id: 1,
        type: 'PURCHASE',
        amount: 5,
        description: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        account: { id: 'acc-1', userId: 'owner-user-id' },
        toAccount: { id: 'acc-2' },
      } as unknown as Transaction;
      const qb = mockQueryBuilder([persistedTx]);
      const transactionsRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      } as unknown as Repository<Transaction>;
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };
      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource, transactionsRepo });
      const auth: ApiAuthContext = {
        userId: 'owner-user-id',
        privilege: ApiTokenPrivilege.USER,
        userType: UserType.USER,
      };
      const actual = await service.findTransactionsForAccount('acc-1', auth, 10);
      expect(actual).toEqual([
        {
          id: 1,
          type: 'PURCHASE',
          amount: 5,
          description: null,
          createdAt: persistedTx.createdAt,
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
        },
      ]);
      expect(qb.limit).toHaveBeenCalledWith(10);
    });

    it('allows an admin to list any account transactions', async () => {
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'acc-1', userId: 'owner-user-id' }),
      };
      const persistedTx = {
        id: 2,
        type: 'MINT',
        amount: 100,
        description: null,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        account: undefined,
        toAccount: { id: 'acc-1' },
      } as unknown as Transaction;
      const qb = mockQueryBuilder([persistedTx]);
      const transactionsRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      } as unknown as Repository<Transaction>;
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };
      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource, transactionsRepo });
      const auth: ApiAuthContext = {
        userId: 'admin-user-id',
        privilege: ApiTokenPrivilege.ADMIN,
        userType: UserType.USER,
      };
      const actual = await service.findTransactionsForAccount('acc-1', auth, 5);
      expect(actual[0]?.fromAccountId).toBeNull();
      expect(actual[0]?.toAccountId).toBe('acc-1');
      expect(qb.limit).toHaveBeenCalledWith(5);
    });

    it('clamps limit to at least 1 and at most 100', async () => {
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'acc-1', userId: 'u1' }),
      };
      const qb = mockQueryBuilder([]);
      const transactionsRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      } as unknown as Repository<Transaction>;
      const cryptoService = {
        decryptCardPrivateKey: jest.fn(),
        publicKeyFromPrivateKeyHex: jest.fn(),
      };
      const itemsService = { findByIds: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn() } };
      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource, transactionsRepo });
      const auth: ApiAuthContext = {
        userId: 'u1',
        privilege: ApiTokenPrivilege.USER,
        userType: UserType.USER,
      };
      await service.findTransactionsForAccount('acc-1', auth, 0);
      expect(qb.limit).toHaveBeenCalledWith(1);
      await service.findTransactionsForAccount('acc-1', auth, 999);
      expect(qb.limit).toHaveBeenCalledWith(100);
    });
  });
});
