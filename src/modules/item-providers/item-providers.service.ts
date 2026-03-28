import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '@modules/users/user.entity';
import { Account } from '@modules/accounts/account.entity';
import { ItemProvider } from './item-provider.entity';
import {
  DEFAULT_LIST_ITEM_PROVIDERS_LIMIT,
  ListItemProvidersQueryDto,
  ListItemProvidersResponseDto,
  MAX_LIST_ITEM_PROVIDERS_LIMIT,
} from './dto/list-item-providers.dto';
import { UpdateItemProviderDto } from './dto/update-item-provider.dto';

@Injectable()
export class ItemProvidersService {
  constructor(
    @InjectRepository(ItemProvider)
    private readonly providersRepo: Repository<ItemProvider>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Account)
    private readonly accountsRepo: Repository<Account>,
  ) {}

  async listForUser(userId: string) {
    return this.providersRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Returns the id of the item provider for this user when one exists (oldest row first).
   */
  async findProviderIdByUserId(userId: string): Promise<string | undefined> {
    const provider = await this.providersRepo.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return provider?.id;
  }

  async getForUserOrFail(providerId: string, userId: string) {
    const provider = await this.providersRepo.findOne({
      where: { id: providerId, userId },
    });
    if (!provider) {
      throw new BadRequestException('Provider not found');
    }
    return provider;
  }

  async createForUser(userId: string, accountId: string, name: string): Promise<ItemProvider> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.type !== UserType.PROVIDER) {
      throw new BadRequestException('User must have type provider to be linked as an item provider');
    }
    const account = await this.accountsRepo.findOne({ where: { id: accountId } });
    if (!account) {
      throw new BadRequestException('Account not found');
    }
    if (account.userId !== user.id) {
      throw new BadRequestException('Account does not belong to user');
    }
    const provider = this.providersRepo.create({ name, user, userId: user.id, account, accountId: account.id });
    return this.providersRepo.save(provider);
  }

  /**
   * Creates an item provider via the admin API. The target user must have user type provider.
   */
  async createAsAdmin(targetUserId: string, accountId: string, name: string): Promise<ItemProvider> {
    return this.createForUser(targetUserId, accountId, name);
  }

  /**
   * Lists item providers for an admin with optional filters and pagination; includes owner and linked account metadata.
   */
  async listAsAdmin(query: ListItemProvidersQueryDto): Promise<ListItemProvidersResponseDto> {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIST_ITEM_PROVIDERS_LIMIT, 1),
      MAX_LIST_ITEM_PROVIDERS_LIMIT,
    );
    const offset = query.offset ?? 0;
    const qb = this.providersRepo
      .createQueryBuilder('provider')
      .innerJoin('provider.user', 'owner')
      .innerJoin('provider.account', 'linkedAccount')
      .select([
        'provider.id',
        'provider.name',
        'provider.userId',
        'provider.accountId',
        'provider.createdAt',
        'provider.updatedAt',
      ])
      .addSelect(['owner.id', 'owner.name', 'owner.userName', 'owner.type', 'owner.createdAt', 'owner.updatedAt'])
      .addSelect(['linkedAccount.nfcCardUid']);
    if (query.userId !== undefined) {
      qb.andWhere('provider.userId = :userId', { userId: query.userId });
    }
    if (query.ownerType !== undefined) {
      qb.andWhere('owner.type = :ownerType', { ownerType: query.ownerType });
    }
    if (query.search !== undefined && query.search.length > 0) {
      const term = `%${query.search}%`;
      qb.andWhere(
        '(provider.name ILIKE :term OR owner.name ILIKE :term OR owner.userName ILIKE :term OR linkedAccount.nfcCardUid ILIKE :term)',
        { term },
      );
    }
    qb.orderBy('provider.createdAt', 'DESC').skip(offset).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      itemProviders: rows.map((provider) => {
        const owner = provider.user;
        const linkedAccount = provider.account;
        return {
          id: provider.id,
          name: provider.name,
          userId: provider.userId,
          accountId: provider.accountId,
          linkedAccountNfcCardUid: linkedAccount.nfcCardUid,
          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt,
          owner: {
            id: owner.id,
            name: owner.name,
            userName: owner.userName,
            type: owner.type,
            createdAt: owner.createdAt,
            updatedAt: owner.updatedAt,
          },
        };
      }),
      total,
    };
  }

  /**
   * Updates an item provider as admin (name and/or linked user and account).
   */
  async updateAsAdmin(providerId: string, dto: UpdateItemProviderDto): Promise<ItemProvider> {
    const hasRelink = dto.userId !== undefined || dto.accountId !== undefined;
    if (hasRelink && (dto.userId === undefined || dto.accountId === undefined)) {
      throw new BadRequestException('userId and accountId must both be provided when relinking');
    }
    const hasName = dto.name !== undefined;
    if (!hasName && !hasRelink) {
      throw new BadRequestException('At least one of name, userId, or accountId must be provided');
    }
    const provider = await this.providersRepo.findOne({
      where: { id: providerId },
      relations: { user: true, account: true },
    });
    if (!provider) {
      throw new NotFoundException('Item provider not found');
    }
    if (dto.name !== undefined) {
      provider.name = dto.name;
    }
    if (hasRelink) {
      const user = await this.usersRepo.findOne({ where: { id: dto.userId! } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      if (user.type !== UserType.PROVIDER) {
        throw new BadRequestException('User must have type provider to be linked as an item provider');
      }
      const account = await this.accountsRepo.findOne({ where: { id: dto.accountId! } });
      if (!account) {
        throw new BadRequestException('Account not found');
      }
      if (account.userId !== user.id) {
        throw new BadRequestException('Account does not belong to user');
      }
      provider.userId = user.id;
      provider.accountId = account.id;
      provider.user = user;
      provider.account = account;
    }
    return this.providersRepo.save(provider);
  }
}
