import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/user.entity';
import { ItemProvider } from './item-provider.entity';

@Injectable()
export class ItemProvidersService {
  constructor(
    @InjectRepository(ItemProvider)
    private readonly providersRepo: Repository<ItemProvider>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async listForUser(userId: string) {
    return this.providersRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
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

  async createForUser(userId: string, name: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const provider = this.providersRepo.create({ name, user, userId: user.id });
    return this.providersRepo.save(provider);
  }

  async createAsAdmin(targetUserId: string, name: string) {
    return this.createForUser(targetUserId, name);
  }
}
