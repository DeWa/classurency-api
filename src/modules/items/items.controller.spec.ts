import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Item } from './item.entity';
import type { CreateProviderItemDto } from './dto/create-provider-item.dto';

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
jest.mock('@common/guards/require-privilege.decorator', () => ({
  RequirePrivilege: () => () => undefined,
}));
jest.mock('@common/guards/api-token.guard', () => ({
  ApiTokenGuard: class ApiTokenGuard {},
}));
const {
  ItemsController,
}: { ItemsController: typeof import('./items.controller').ItemsController } = require('./items.controller');

describe('ItemsController', () => {
  function createRequest(userId?: string): Request & { apiAuth?: { userId: string } } {
    return userId ? ({ apiAuth: { userId } } as Request & { apiAuth?: { userId: string } }) : ({} as Request);
  }

  describe('createProviderItem()', () => {
    it('checks ownership and creates item under provider', async () => {
      const mockProvider = { id: 'provider-1' };
      const createdItem: Partial<Item> = { id: 'item-1', providerId: 'provider-1', name: 'Soda' };
      const itemsService = { addItemToProvider: jest.fn().mockResolvedValue(createdItem) };
      const itemProvidersService = { getForUserOrFail: jest.fn().mockResolvedValue(mockProvider) };
      const controller = new ItemsController(itemsService as never, itemProvidersService as never);
      const inputDto: CreateProviderItemDto = {
        name: 'Soda',
        description: '330ml',
        value: 1.5,
        amount: 10,
      };

      const actualItem = await controller.createProviderItem('provider-1', inputDto, createRequest('user-1'));

      expect(itemProvidersService.getForUserOrFail).toHaveBeenCalledWith('provider-1', 'user-1');
      expect(itemsService.addItemToProvider).toHaveBeenCalledWith(mockProvider, 'Soda', '330ml', 1.5, 10);
      expect(actualItem).toEqual(createdItem);
    });

    it('throws UnauthorizedException without auth context', async () => {
      const itemsService = { addItemToProvider: jest.fn() };
      const itemProvidersService = { getForUserOrFail: jest.fn() };
      const controller = new ItemsController(itemsService as never, itemProvidersService as never);
      const inputDto: CreateProviderItemDto = { name: 'Soda', description: '330ml', value: 1.5 };

      await expect(controller.createProviderItem('provider-1', inputDto, createRequest())).rejects.toThrow(
        UnauthorizedException,
      );
      expect(itemProvidersService.getForUserOrFail).not.toHaveBeenCalled();
    });
  });

  describe('listProviderItems()', () => {
    it('checks ownership and returns provider items', async () => {
      const expectedItems: Partial<Item>[] = [
        { id: 'item-1', providerId: 'provider-1' },
        { id: 'item-2', providerId: 'provider-1' },
      ];
      const itemsService = { listByProvider: jest.fn().mockResolvedValue(expectedItems) };
      const itemProvidersService = { getForUserOrFail: jest.fn().mockResolvedValue({ id: 'provider-1' }) };
      const controller = new ItemsController(itemsService as never, itemProvidersService as never);

      const actualItems = await controller.listProviderItems('provider-1', createRequest('user-1'));

      expect(itemProvidersService.getForUserOrFail).toHaveBeenCalledWith('provider-1', 'user-1');
      expect(itemsService.listByProvider).toHaveBeenCalledWith('provider-1');
      expect(actualItems).toEqual(expectedItems);
    });
  });

  describe('getProviderItem()', () => {
    it('returns item when provider owns item', async () => {
      const expectedItem: Partial<Item> = { id: 'item-1', providerId: 'provider-1' };
      const itemsService = { findById: jest.fn().mockResolvedValue(expectedItem) };
      const itemProvidersService = { getForUserOrFail: jest.fn().mockResolvedValue({ id: 'provider-1' }) };
      const controller = new ItemsController(itemsService as never, itemProvidersService as never);

      const actualItem = await controller.getProviderItem('provider-1', 'item-1', createRequest('user-1'));

      expect(itemProvidersService.getForUserOrFail).toHaveBeenCalledWith('provider-1', 'user-1');
      expect(itemsService.findById).toHaveBeenCalledWith('item-1');
      expect(actualItem).toEqual(expectedItem);
    });

    it('throws when item is not under provider', async () => {
      const itemsService = { findById: jest.fn().mockResolvedValue({ id: 'item-1', providerId: 'provider-2' }) };
      const itemProvidersService = { getForUserOrFail: jest.fn().mockResolvedValue({ id: 'provider-1' }) };
      const controller = new ItemsController(itemsService as never, itemProvidersService as never);

      await expect(controller.getProviderItem('provider-1', 'item-1', createRequest('user-1'))).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
