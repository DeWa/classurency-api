import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ItemProvider } from '@modules/item-providers/item-provider.entity';
import { Item } from './item.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    @InjectRepository(ItemProvider)
    private readonly providersRepo: Repository<ItemProvider>,
  ) {}

  async listByProvider(providerId: string) {
    return this.itemsRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  async addItemToProvider(providerId: string, name: string, description: string, value: number, amount: number | null) {
    const provider = await this.providersRepo.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new BadRequestException('Provider not found');
    }
    const item = this.itemsRepo.create({
      name,
      description,
      value,
      amount,
      provider,
    });
    return this.itemsRepo.save(item);
  }

  async findById(itemId: string) {
    return this.itemsRepo.findOne({ where: { id: itemId } });
  }

  async findByIds(itemIds: string[]): Promise<Item[]> {
    return this.itemsRepo.find({ where: { id: In(itemIds) } });
  }

  async updateAmount(itemId: string, amount: number) {
    const item = await this.findById(itemId);
    if (!item) {
      throw new BadRequestException('Item not found');
    }
    item.amount = amount;
    return this.itemsRepo.save(item);
  }
}
