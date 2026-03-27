import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '@modules/users/user.entity';
import { Account } from '@modules/accounts/account.entity';
import { ItemProvider } from './item-provider.entity';

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

  async createAsAdmin(targetUserId: string, accountId: string, name: string): Promise<ItemProvider> {
    return this.createForUser(targetUserId, accountId, name);
  }
}
