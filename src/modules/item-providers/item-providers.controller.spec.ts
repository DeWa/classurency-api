import type { ItemProvider } from './item-provider.entity';
import type { CreateItemProviderDto } from './dto/create-item-provider.dto';

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
jest.mock('@common/guards/require-privilege.decorator', () => ({
  RequirePrivilege: () => () => undefined,
}));
jest.mock('@common/guards/api-token.guard', () => ({
  ApiTokenGuard: class ApiTokenGuard {},
}));
const {
  ItemProvidersController,
}: {
  ItemProvidersController: typeof import('./item-providers.controller').ItemProvidersController;
} = require('./item-providers.controller');

describe('ItemProvidersController', () => {
  describe('createItemProvider()', () => {
    it('delegates to service with admin payload fields', async () => {
      const expectedProvider: Partial<ItemProvider> = {
        id: 'provider-1',
        userId: 'user-1',
        accountId: 'account-1',
        name: 'Cafeteria',
      };
      const itemProvidersService = {
        createAsAdmin: jest.fn().mockResolvedValue(expectedProvider),
      };
      const controller = new ItemProvidersController(itemProvidersService as never);
      const inputDto: CreateItemProviderDto = {
        userId: 'user-1',
        accountId: 'account-1',
        name: 'Cafeteria',
      };

      const actualProvider = await controller.createItemProvider(inputDto);

      expect(itemProvidersService.createAsAdmin).toHaveBeenCalledWith('user-1', 'account-1', 'Cafeteria');
      expect(actualProvider).toEqual(expectedProvider);
    });
  });
});
