import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { Account } from '@modules/accounts/account.entity';
import { ItemProvidersService } from '@modules/item-providers/item-providers.service';
import { User, UserType } from './user.entity';
import { UserAccountSummaryDto } from './dto/user-account-summary.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRequestDto, UpdateUserResponseDto } from './dto/update-user.dto';
import {
  isUserNameAlreadyExistsError,
  UserNameAlreadyExistsException,
} from './errors/user-name-already-exists.exception';
import {
  DEFAULT_LIST_USERS_LIMIT,
  ListUsersQueryDto,
  ListUsersResponseDto,
  MAX_LIST_USERS_LIMIT,
} from './dto/list-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly cryptoService: CryptoService,
    private readonly itemProvidersService: ItemProvidersService,
  ) {}

  /**
   * Create a new user
   * @param name - The name of the user
   * @param userName - The username of the user
   * @param password - The password of the user
   * @param type - The type of the user (defaults to regular user)
   * @returns The created user
   */
  async createUser(name: string, userName: string, password: string, type: UserType = UserType.USER) {
    const passwordHash = await this.cryptoService.hashPassword(password);
    const user = this.usersRepo.create({
      name,
      userName,
      passwordHash,
      type,
    });
    try {
      await this.usersRepo.save(user);
    } catch (error: unknown) {
      if (isUserNameAlreadyExistsError(error)) {
        throw new UserNameAlreadyExistsException();
      }
      throw error;
    }
    return {
      id: user.id,
      name: user.name,
      userName: user.userName,
      type: user.type,
    };
  }

  /**
   * Create a new user with a random password
   * @param name - The name of the user
   * @param type - The type of the user
   * @returns The created user
   */
  async createUserAsAdmin(dto: CreateUserDto) {
    const password = this.cryptoService.generateRandomPassword(6);
    const userType = dto.type ?? UserType.USER;
    const user = await this.createUser(dto.name, dto.userName, password, userType);
    return {
      id: user.id,
      name: user.name,
      userName: user.userName,
      type: user.type,
      password,
    };
  }

  /**
   * Update a user
   * @param dto - The update user request dto
   * @returns The updated user
   */
  async updateUser(
    reqUserId: string,
    userId: string,
    dto: UpdateUserRequestDto,
    options?: { isAdmin?: boolean },
  ): Promise<UpdateUserResponseDto> {
    if (reqUserId !== userId && !options?.isAdmin) {
      throw new ForbiddenException('You are not allowed to update this user');
    }
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.password !== undefined) {
      user.passwordHash = await this.cryptoService.hashPassword(dto.password);
    }

    if (dto.type !== undefined) {
      if (!options?.isAdmin) {
        throw new ForbiddenException('You are not allowed to change user type');
      }
      user.type = dto.type;
    }

    const savedUser = await this.usersRepo.save(user);
    return { id: savedUser.id, name: savedUser.name, type: savedUser.type };
  }

  /**
   * Load a user. Optionally loads account summaries (no secrets) for each account.
   */
  async getUser(userId: string, options?: { includeAccounts?: boolean }): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: options?.includeAccounts ? ['accounts'] : [],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const providerId =
      user.type === UserType.PROVIDER ? await this.itemProvidersService.findProviderIdByUserId(userId) : undefined;
    const withProviderId = providerId !== undefined ? Object.assign(user, { providerId }) : user;
    if (!options?.includeAccounts) {
      return withProviderId;
    }
    return Object.assign(withProviderId, {
      accounts: (user.accounts ?? []).map((account) => this.mapAccountToSummary(account)),
    });
  }

  /**
   * Lists users for an admin with optional type filter, name search, and pagination.
   * @param query - Filters and pagination.
   * @returns Matching users and total count.
   */
  async listUsersAsAdmin(query: ListUsersQueryDto): Promise<ListUsersResponseDto> {
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIST_USERS_LIMIT, 1), MAX_LIST_USERS_LIMIT);
    const offset = query.offset ?? 0;
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.userName', 'user.type', 'user.createdAt', 'user.updatedAt']);
    if (query.type !== undefined) {
      qb.andWhere('user.type = :type', { type: query.type });
    }
    if (query.search !== undefined && query.search.length > 0) {
      const term = `%${query.search}%`;
      qb.andWhere('(user.name ILIKE :term OR user.userName ILIKE :term)', { term });
    }
    qb.orderBy('user.createdAt', 'DESC').skip(offset).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        userName: u.userName,
        type: u.type,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
    };
  }

  private mapAccountToSummary(account: Account): UserAccountSummaryDto {
    return {
      id: account.id,
      nfcCardUid: account.nfcCardUid,
      publicKeyHex: account.publicKeyHex,
      balance: Number(account.balance),
      isLocked: account.isLocked,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
