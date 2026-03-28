import type { Repository } from 'typeorm';
import type { Account as AccountEntity } from './account.entity';
import { Account } from './account.entity';
import type { User as UserEntity } from '@modules/users/user.entity';
import { User, UserType } from '@modules/users/user.entity';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

jest.mock('@common/crypto/crypto.service', () => ({
  CryptoService: class CryptoService {},
}));

const {
  AccountsService,
}: { AccountsService: typeof import('./accounts.service').AccountsService } = require('./accounts.service');
type AccountsServiceType = InstanceType<typeof AccountsService>;

describe('AccountsService', () => {
  function createService(params: {
    accountsRepo: { findOne?: jest.Mock; save?: jest.Mock; createQueryBuilder?: jest.Mock };
    usersRepo?: { findOne?: jest.Mock };
    accountAttemptsRepo?: { create?: jest.Mock; save?: jest.Mock };
  }): AccountsServiceType {
    const accountsRepo = params.accountsRepo;
    const usersRepo = params.usersRepo ?? { findOne: jest.fn() };
    const accountAttemptsRepo = params.accountAttemptsRepo ?? { create: jest.fn(), save: jest.fn() };
    return new AccountsService(
      accountsRepo as unknown as Repository<AccountEntity>,
      usersRepo as unknown as Repository<UserEntity>,
      accountAttemptsRepo as unknown as Repository<unknown>,
      {} as unknown,
    );
  }

  describe('listAccountsAsAdmin()', () => {
    it('applies filters and maps account and owner fields', async () => {
      const owner: User = {
        id: 'owner-1',
        name: 'Owner',
        userName: 'owner',
        passwordHash: 'hidden',
        type: UserType.USER,
        accounts: [],
        createdAt: new Date('2021-01-01'),
        updatedAt: new Date('2021-01-02'),
      };
      const account: Account = {
        id: 'acc-1',
        userId: owner.id,
        user: owner,
        nfcCardUid: 'nfc-1',
        pinHash: 'hidden',
        publicKeyHex: '0xabc',
        encryptedPrivateKey: 'hidden',
        balance: 10,
        isLocked: false,
        attempts: [],
        createdAt: new Date('2022-01-01'),
        updatedAt: new Date('2022-01-02'),
      };
      const getManyAndCount = jest.fn().mockResolvedValue([[account], 7]);
      const qb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      const accountsRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };
      const service = createService({ accountsRepo });

      const actual = await service.listAccountsAsAdmin({
        userId: 'owner-1',
        ownerType: UserType.USER,
        isLocked: false,
        search: 'nfc',
        limit: 25,
        offset: 3,
      });

      expect(accountsRepo.createQueryBuilder).toHaveBeenCalledWith('account');
      expect(qb.innerJoin).toHaveBeenCalledWith('account.user', 'owner');
      expect(qb.andWhere).toHaveBeenCalledWith('account.userId = :userId', { userId: 'owner-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('owner.type = :ownerType', { ownerType: UserType.USER });
      expect(qb.andWhere).toHaveBeenCalledWith('account.isLocked = :isLocked', { isLocked: false });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(account.nfcCardUid ILIKE :term OR owner.name ILIKE :term OR owner.userName ILIKE :term)',
        { term: '%nfc%' },
      );
      expect(qb.skip).toHaveBeenCalledWith(3);
      expect(qb.take).toHaveBeenCalledWith(25);
      expect(actual).toEqual({
        accounts: [
          {
            id: 'acc-1',
            userId: 'owner-1',
            nfcCardUid: 'nfc-1',
            publicKeyHex: '0xabc',
            balance: 10,
            isLocked: false,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            owner: {
              id: owner.id,
              name: owner.name,
              userName: owner.userName,
              type: owner.type,
              createdAt: owner.createdAt,
              updatedAt: owner.updatedAt,
            },
          },
        ],
        total: 7,
      });
    });

    it('omits optional filters when not provided', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      const qb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      const accountsRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };
      const service = createService({ accountsRepo });

      await service.listAccountsAsAdmin({});

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });
  });

  describe('updateAccountAsAdmin()', () => {
    it('updates isLocked when account exists', async () => {
      const account: Account = {
        id: 'acc-1',
        userId: 'user-1',
        user: {} as User,
        nfcCardUid: null,
        pinHash: 'hidden',
        publicKeyHex: '0x',
        encryptedPrivateKey: 'hidden',
        balance: 0,
        isLocked: false,
        attempts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue(account),
        save: jest.fn().mockImplementation((a: Account) => Promise.resolve(a)),
        createQueryBuilder: jest.fn(),
      };
      const service = createService({ accountsRepo });

      const actual = await service.updateAccountAsAdmin('acc-1', { isLocked: true });

      expect(actual.isLocked).toBe(true);
      expect(accountsRepo.save).toHaveBeenCalled();
    });

    it('throws when account is missing', async () => {
      const accountsRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      };
      const service = createService({ accountsRepo });

      await expect(service.updateAccountAsAdmin('missing', { isLocked: true })).rejects.toThrow('Account not found');
    });

    it('throws when body is empty', async () => {
      const accountsRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      };
      const service = createService({ accountsRepo });

      await expect(service.updateAccountAsAdmin('acc-1', {})).rejects.toThrow('At least one field must be provided');
    });
  });
});
