import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UserType, type User } from '@modules/users/user.entity';
import type { Account } from '@modules/accounts/account.entity';
import type { ItemProvider } from './item-provider.entity';
import { ItemProvidersService } from './item-providers.service';

type ItemProvidersServiceType = InstanceType<typeof ItemProvidersService>;

describe('ItemProvidersService', () => {
  function createService(params: {
    providersRepo: {
      create: jest.Mock;
      save: jest.Mock;
      find: jest.Mock;
      findOne: jest.Mock;
      createQueryBuilder?: jest.Mock;
    };
    usersRepo: { findOne: jest.Mock };
    accountsRepo: { findOne: jest.Mock };
  }): ItemProvidersServiceType {
    return new ItemProvidersService(
      params.providersRepo as unknown as Repository<ItemProvider>,
      params.usersRepo as unknown as Repository<User>,
      params.accountsRepo as unknown as Repository<Account>,
    );
  }

  describe('createForUser()', () => {
    it('creates provider when user and account ownership are valid', async () => {
      const user: Partial<User> = { id: 'user-1', type: UserType.PROVIDER };
      const account: Partial<Account> = { id: 'account-1', userId: 'user-1' };
      const provider: Partial<ItemProvider> = { id: 'provider-1', userId: 'user-1', accountId: 'account-1' };
      const providersRepo = {
        create: jest.fn().mockReturnValue(provider),
        save: jest.fn().mockResolvedValue(provider),
        find: jest.fn(),
        findOne: jest.fn(),
      };
      const usersRepo = { findOne: jest.fn().mockResolvedValue(user) };
      const accountsRepo = { findOne: jest.fn().mockResolvedValue(account) };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      const actualProvider = await service.createForUser('user-1', 'account-1', 'Cafeteria');

      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(accountsRepo.findOne).toHaveBeenCalledWith({ where: { id: 'account-1' } });
      expect(providersRepo.create).toHaveBeenCalledWith({
        name: 'Cafeteria',
        user,
        userId: 'user-1',
        account,
        accountId: 'account-1',
      });
      expect(actualProvider).toEqual(provider);
    });

    it('throws when target user is missing', async () => {
      const providersRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
      const usersRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const accountsRepo = { findOne: jest.fn() };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      await expect(service.createForUser('user-1', 'account-1', 'Cafeteria')).rejects.toThrow(BadRequestException);
      expect(accountsRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws when user is not a provider', async () => {
      const user: Partial<User> = { id: 'user-1', type: UserType.USER };
      const providersRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
      const usersRepo = { findOne: jest.fn().mockResolvedValue(user) };
      const accountsRepo = { findOne: jest.fn() };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      await expect(service.createForUser('user-1', 'account-1', 'Cafeteria')).rejects.toThrow(
        'User must have type provider to be linked as an item provider',
      );
      expect(accountsRepo.findOne).not.toHaveBeenCalled();
      expect(providersRepo.create).not.toHaveBeenCalled();
    });

    it('throws when account does not belong to user', async () => {
      const user: Partial<User> = { id: 'user-1', type: UserType.PROVIDER };
      const account: Partial<Account> = { id: 'account-1', userId: 'user-2' };
      const providersRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
      const usersRepo = { findOne: jest.fn().mockResolvedValue(user) };
      const accountsRepo = { findOne: jest.fn().mockResolvedValue(account) };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      await expect(service.createForUser('user-1', 'account-1', 'Cafeteria')).rejects.toThrow(BadRequestException);
      expect(providersRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findProviderIdByUserId()', () => {
    it('returns the oldest provider id when multiple exist', async () => {
      const providersRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue({ id: 'oldest-provider-id' }),
      };
      const usersRepo = { findOne: jest.fn() };
      const accountsRepo = { findOne: jest.fn() };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      const actualId = await service.findProviderIdByUserId('user-1');

      expect(providersRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'ASC' },
      });
      expect(actualId).toBe('oldest-provider-id');
    });

    it('returns undefined when no provider exists', async () => {
      const providersRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const usersRepo = { findOne: jest.fn() };
      const accountsRepo = { findOne: jest.fn() };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      const actualId = await service.findProviderIdByUserId('user-1');

      expect(actualId).toBeUndefined();
    });
  });

  describe('listAsAdmin()', () => {
    it('maps rows with owner and linked NFC uid', async () => {
      const owner: User = {
        id: 'owner-1',
        name: 'Owner',
        userName: 'owner',
        passwordHash: 'hidden',
        type: UserType.PROVIDER,
        accounts: [],
        createdAt: new Date('2021-01-01'),
        updatedAt: new Date('2021-01-02'),
      };
      const linkedAccount: Account = {
        id: 'acc-1',
        userId: owner.id,
        user: owner,
        nfcCardUid: 'nfc-uid-1',
        pinHash: 'hidden',
        publicKeyHex: '0xabc',
        encryptedPrivateKey: 'hidden',
        balance: 0,
        isLocked: false,
        attempts: [],
        createdAt: new Date('2022-01-01'),
        updatedAt: new Date('2022-01-02'),
      };
      const provider: ItemProvider = {
        id: 'prov-1',
        name: 'Shop',
        userId: owner.id,
        accountId: linkedAccount.id,
        user: owner,
        account: linkedAccount,
        items: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };
      const getManyAndCount = jest.fn().mockResolvedValue([[provider], 3]);
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
      const providersRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };
      const usersRepo = { findOne: jest.fn() };
      const accountsRepo = { findOne: jest.fn() };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      const actual = await service.listAsAdmin({
        userId: 'owner-1',
        ownerType: UserType.PROVIDER,
        search: 'shop',
        limit: 10,
        offset: 1,
      });

      expect(providersRepo.createQueryBuilder).toHaveBeenCalledWith('provider');
      expect(qb.andWhere).toHaveBeenCalledWith('provider.userId = :userId', { userId: 'owner-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('owner.type = :ownerType', { ownerType: UserType.PROVIDER });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(provider.name ILIKE :term OR owner.name ILIKE :term OR owner.userName ILIKE :term OR linkedAccount.nfcCardUid ILIKE :term)',
        { term: '%shop%' },
      );
      expect(actual.itemProviders[0]?.linkedAccountNfcCardUid).toBe('nfc-uid-1');
      expect(actual.total).toBe(3);
    });
  });

  describe('updateAsAdmin()', () => {
    it('updates name only', async () => {
      const owner: Partial<User> = { id: 'u1', type: UserType.PROVIDER };
      const account: Partial<Account> = { id: 'a1', userId: 'u1' };
      const provider: Partial<ItemProvider> = {
        id: 'p1',
        name: 'Old',
        userId: 'u1',
        accountId: 'a1',
        user: owner as User,
        account: account as Account,
      };
      const providersRepo = {
        create: jest.fn(),
        save: jest.fn().mockImplementation((p: ItemProvider) => Promise.resolve(p)),
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(provider),
        createQueryBuilder: jest.fn(),
      };
      const usersRepo = { findOne: jest.fn() };
      const accountsRepo = { findOne: jest.fn() };
      const service = createService({ providersRepo, usersRepo, accountsRepo });

      const actual = await service.updateAsAdmin('p1', { name: 'New Name' });

      expect(actual.name).toBe('New Name');
      expect(providersRepo.save).toHaveBeenCalled();
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws when provider is missing', async () => {
      const providersRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(null),
        createQueryBuilder: jest.fn(),
      };
      const service = createService({
        providersRepo,
        usersRepo: { findOne: jest.fn() },
        accountsRepo: { findOne: jest.fn() },
      });

      await expect(service.updateAsAdmin('p1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws when relink is partial', async () => {
      const providersRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
      };
      const service = createService({
        providersRepo,
        usersRepo: { findOne: jest.fn() },
        accountsRepo: { findOne: jest.fn() },
      });

      await expect(service.updateAsAdmin('p1', { userId: 'u1' })).rejects.toThrow(
        'userId and accountId must both be provided when relinking',
      );
    });
  });
});
