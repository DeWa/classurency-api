import { BadRequestException } from '@nestjs/common';
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TransactionsService } = require('./transactions.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TransferDto } = require('./dto/transfer.dto');

describe('TransactionsService', () => {
  function createService(params: {
    accountsRepo: { findOne: jest.Mock };
    cryptoService: { decryptCardPrivateKey: jest.Mock; publicKeyFromPrivateKeyHex: jest.Mock };
    itemsService: { findByIds: jest.Mock };
    dataSource: { manager: { transaction: jest.Mock } };
  }): TransactionsService {
    const transactionsRepo = {} as any;
    const blockchainService = {} as any;
    const accountsService = {} as any;

    return new TransactionsService(
      transactionsRepo,
      params.accountsRepo as any,
      params.cryptoService as any,
      blockchainService,
      accountsService,
      params.itemsService as any,
      params.dataSource as any,
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
        .mockResolvedValue({ id: 123 } as any);

      const dto: TransferDto = {
        nfcCardUid: 'card-uid',
        toAccountId: 'to-account-id',
        value: 2.5,
        description: 'Lunch',
        pin: '1234',
        encryptedPrivateKeyFromCard: 'encrypted-private-key',
      };
      const apiAuth = { userId: 'requester-user-id' } as any;

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

      const dto: TransferDto = {
        nfcCardUid: 'unknown-card-uid',
        toAccountId: 'to-account-id',
        value: 2.5,
        description: undefined,
        pin: '1234',
        encryptedPrivateKeyFromCard: 'encrypted-private-key',
      };
      const apiAuth = { userId: 'requester-user-id' } as any;

      await expect(service.transfer(dto, apiAuth, '127.0.0.1')).rejects.toThrow('Payer account not found');
    });
  });

  describe('purchaseItems()', () => {
    it('resolves fromAccountId before calling transferToAccount', async () => {
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
          amount: null,
        },
      ];
      const itemsService = {
        findByIds: jest.fn().mockResolvedValue(items),
      };

      const mockManager = {} as any;
      const dataSource = {
        manager: {
          transaction: jest.fn().mockImplementation(async (callback: any) => callback(mockManager)),
        },
      };

      const service = createService({ accountsRepo, cryptoService, itemsService, dataSource });
      const transferToAccountSpy = jest
        .spyOn(service, 'transferToAccount')
        .mockResolvedValue({ id: 999 } as any);

      const result = await service.purchaseItems(
        {
          pin: '1234',
          encryptedPrivateKeyFromCard: 'encrypted-private-key',
        },
        ['item-1'],
        'provider-account-id',
        'requester-user-id',
        '127.0.0.1',
        undefined,
      );

      expect(result.transactionId).toBe(999);
      expect(result.remainingAmount).toEqual({});
      expect(transferToAccountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterUserId: 'requester-user-id',
          fromAccountId: 'payer-account-id',
          toAccountId: 'provider-account-id',
        }),
        mockManager,
      );
    });
  });
});

