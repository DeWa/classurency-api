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
  }): TransactionsServiceType {
    const transactionsRepo = {} as unknown as Repository<Transaction>;
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
});
