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
  ) {}

  async listByProvider(providerId: string) {
    return this.itemsRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Creates an item for a provider that has already been loaded (e.g. after an ownership check).
   */
  async addItemToProvider(
    provider: ItemProvider,
    name: string,
    description: string,
    value: number,
    amount: number | null,
  ) {
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
