import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User as UserEntity } from './user.entity';
import { User, UserType } from './user.entity';
import type { UpdateUserRequestDto } from './dto/update-user.dto';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

jest.mock('@common/crypto/crypto.service', () => ({
  CryptoService: class CryptoService {},
}));

const { UsersService }: { UsersService: typeof import('./users.service').UsersService } = require('./users.service');
type UsersServiceType = InstanceType<typeof UsersService>;

describe('UsersService', () => {
  function createService(params: {
    usersRepo: { findOne: jest.Mock; save: jest.Mock; createQueryBuilder?: jest.Mock };
    cryptoService: { hashPassword: jest.Mock };
    itemProvidersService?: { findProviderIdByUserId: jest.Mock };
  }): UsersServiceType {
    const itemProvidersService = params.itemProvidersService ?? {
      findProviderIdByUserId: jest.fn().mockResolvedValue(undefined),
    };
    return new UsersService(
      params.usersRepo as unknown as Repository<UserEntity>,
      params.cryptoService as unknown,
      itemProvidersService as unknown,
    );
  }

  describe('updateUser()', () => {
    it('throws ForbiddenException when reqUserId does not match userId', async () => {
      const usersRepo = { findOne: jest.fn(), save: jest.fn() };
      const cryptoService = { hashPassword: jest.fn() };
      const service = createService({ usersRepo, cryptoService });

      await expect(
        service.updateUser('requester-user-id', 'target-user-id', {} as UpdateUserRequestDto),
      ).rejects.toThrow(ForbiddenException);

      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist', async () => {
      const usersRepo = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
      const cryptoService = { hashPassword: jest.fn() };
      const service = createService({ usersRepo, cryptoService });

      await expect(service.updateUser('user-id', 'user-id', {} as UpdateUserRequestDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-id' } });
    });

    it('forbids non-admin users from changing their type', async () => {
      const existingUser: User = {
        id: 'user-id',
        name: 'Alice',
        userName: 'alice',
        passwordHash: 'old',
        type: UserType.USER,
        accounts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const usersRepo = { findOne: jest.fn().mockResolvedValue(existingUser), save: jest.fn() };
      const cryptoService = { hashPassword: jest.fn() };
      const service = createService({ usersRepo, cryptoService });

      const dto: UpdateUserRequestDto = { type: UserType.ADMIN } as UpdateUserRequestDto;

      await expect(service.updateUser('user-id', 'user-id', dto)).rejects.toThrow(ForbiddenException);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('hashes password updates into passwordHash and returns a safe response', async () => {
      const existingUser: User = {
        id: 'user-id',
        name: 'Alice',
        userName: 'alice',
        passwordHash: 'old',
        type: UserType.USER,
        accounts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const usersRepo = {
        findOne: jest.fn().mockResolvedValue(existingUser),
        save: jest.fn().mockImplementation(async (userToSave: User) => userToSave),
      };
      const cryptoService = { hashPassword: jest.fn().mockResolvedValue('new-hash') };
      const service = createService({ usersRepo, cryptoService });

      const dto: UpdateUserRequestDto = { password: 'new-password' } as UpdateUserRequestDto;

      const response = await service.updateUser('user-id', 'user-id', dto);

      expect(cryptoService.hashPassword).toHaveBeenCalledWith('new-password');
      expect(usersRepo.save).toHaveBeenCalled();
      expect((usersRepo.save.mock.calls[0]?.[0] as User).passwordHash).toBe('new-hash');

      expect(response).toEqual({ id: 'user-id', name: 'Alice', type: UserType.USER });
      expect('passwordHash' in response).toBe(false);
    });

    it('allows admins to update their type', async () => {
      const existingUser: User = {
        id: 'admin-user-id',
        name: 'Admin',
        userName: 'admin',
        passwordHash: 'old',
        type: UserType.ADMIN,
        accounts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const usersRepo = {
        findOne: jest.fn().mockResolvedValue(existingUser),
        save: jest.fn().mockImplementation(async (userToSave: User) => userToSave),
      };
      const cryptoService = { hashPassword: jest.fn() };
      const service = createService({ usersRepo, cryptoService });

      const dto: UpdateUserRequestDto = { type: UserType.USER } as UpdateUserRequestDto;

      const response = await service.updateUser('admin-user-id', 'admin-user-id', dto);

      expect(usersRepo.save).toHaveBeenCalled();
      expect(response.type).toBe(UserType.USER);
    });
  });

  describe('getUser()', () => {
    it('includes providerId when user type is provider and a provider exists', async () => {
      const providerUser: User = {
        id: 'user-id',
        name: 'P',
        userName: 'p',
        passwordHash: 'h',
        type: UserType.PROVIDER,
        accounts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const usersRepo = { findOne: jest.fn().mockResolvedValue(providerUser), save: jest.fn() };
      const cryptoService = { hashPassword: jest.fn() };
      const itemProvidersService = { findProviderIdByUserId: jest.fn().mockResolvedValue('provider-uuid') };
      const service = createService({ usersRepo, cryptoService, itemProvidersService });

      const actual = await service.getUser('user-id');

      expect(itemProvidersService.findProviderIdByUserId).toHaveBeenCalledWith('user-id');
      expect((actual as { providerId?: string }).providerId).toBe('provider-uuid');
    });

    it('does not call item providers when user type is not provider', async () => {
      const normalUser: User = {
        id: 'user-id',
        name: 'U',
        userName: 'u',
        passwordHash: 'h',
        type: UserType.USER,
        accounts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const usersRepo = { findOne: jest.fn().mockResolvedValue(normalUser), save: jest.fn() };
      const cryptoService = { hashPassword: jest.fn() };
      const itemProvidersService = { findProviderIdByUserId: jest.fn() };
      const service = createService({ usersRepo, cryptoService, itemProvidersService });

      await service.getUser('user-id');

      expect(itemProvidersService.findProviderIdByUserId).not.toHaveBeenCalled();
    });
  });

  describe('listUsersAsAdmin()', () => {
    it('applies type filter, ILIKE search, pagination, and returns total', async () => {
      const row: User = {
        id: 'u1',
        name: 'Alice',
        userName: 'alice',
        passwordHash: 'x',
        type: UserType.USER,
        accounts: [],
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-02'),
      };
      const getManyAndCount = jest.fn().mockResolvedValue([[row], 42]);
      const qb = {
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      const usersRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };
      const cryptoService = { hashPassword: jest.fn() };
      const service = createService({ usersRepo, cryptoService });

      const actual = await service.listUsersAsAdmin({
        type: UserType.USER,
        search: 'lic',
        limit: 10,
        offset: 5,
      });

      expect(usersRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qb.andWhere).toHaveBeenCalledWith('user.type = :type', { type: UserType.USER });
      expect(qb.andWhere).toHaveBeenCalledWith('(user.name ILIKE :term OR user.userName ILIKE :term)', {
        term: '%lic%',
      });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(actual).toEqual({
        users: [
          {
            id: 'u1',
            name: 'Alice',
            userName: 'alice',
            type: UserType.USER,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        ],
        total: 42,
      });
    });

    it('omits optional filters when not provided', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      const qb = {
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      const usersRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };
      const cryptoService = { hashPassword: jest.fn() };
      const service = createService({ usersRepo, cryptoService });

      await service.listUsersAsAdmin({});

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });
  });
});
