import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UserType, type User } from '@modules/users/user.entity';
import type { Account } from '@modules/accounts/account.entity';
import type { ItemProvider } from './item-provider.entity';
import { ItemProvidersService } from './item-providers.service';

type ItemProvidersServiceType = InstanceType<typeof ItemProvidersService>;

describe('ItemProvidersService', () => {
  function createService(params: {
    providersRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };
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
});
