/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
jest.mock('@common/guards/require-privilege.decorator', () => ({
  RequirePrivilege: () => () => undefined,
}));
jest.mock('@common/guards/api-token.guard', () => ({
  ApiTokenGuard: class ApiTokenGuard {},
}));
jest.mock('./admin.service', () => ({
  AdminService: class AdminService {},
}));
jest.mock('@modules/accounts/accounts.service', () => ({
  AccountsService: class AccountsService {},
}));
jest.mock('@modules/item-providers/item-providers.service', () => ({
  ItemProvidersService: class ItemProvidersService {},
}));
const {
  AdminController,
}: {
  AdminController: typeof import('./admin.controller').AdminController;
} = require('./admin.controller');

describe('AdminController', () => {
  describe('listItemProviders()', () => {
    it('delegates to ItemProvidersService.listAsAdmin', async () => {
      const expected = { itemProviders: [], total: 0 };
      const itemProvidersService = { listAsAdmin: jest.fn().mockResolvedValue(expected) };
      const adminService = {};
      const accountsService = {};
      const controller = new AdminController(
        adminService as never,
        itemProvidersService as never,
        accountsService as never,
      );
      const query = { limit: 10, offset: 0 };

      const actual = await controller.listItemProviders(query as never);

      expect(itemProvidersService.listAsAdmin).toHaveBeenCalledWith(query);
      expect(actual).toBe(expected);
    });
  });

  describe('listAccounts()', () => {
    it('delegates to AccountsService.listAccountsAsAdmin', async () => {
      const expected = { accounts: [], total: 0 };
      const itemProvidersService = {};
      const adminService = {};
      const accountsService = { listAccountsAsAdmin: jest.fn().mockResolvedValue(expected) };
      const controller = new AdminController(
        adminService as never,
        itemProvidersService as never,
        accountsService as never,
      );
      const query = {};

      const actual = await controller.listAccounts(query as never);

      expect(accountsService.listAccountsAsAdmin).toHaveBeenCalledWith(query);
      expect(actual).toBe(expected);
    });
  });

  describe('updateAccount()', () => {
    it('maps saved account to AdminAccountPatchResponseDto', async () => {
      const updatedAt = new Date('2024-06-01T00:00:00.000Z');
      const itemProvidersService = {};
      const adminService = {};
      const accountsService = {
        updateAccountAsAdmin: jest.fn().mockResolvedValue({
          id: 'acc-1',
          userId: 'user-1',
          isLocked: true,
          updatedAt,
        }),
      };
      const controller = new AdminController(
        adminService as never,
        itemProvidersService as never,
        accountsService as never,
      );

      const actual = await controller.updateAccount('acc-1', { isLocked: true });

      expect(accountsService.updateAccountAsAdmin).toHaveBeenCalledWith('acc-1', { isLocked: true });
      expect(actual).toEqual({
        id: 'acc-1',
        userId: 'user-1',
        isLocked: true,
        updatedAt,
      });
    });
  });
});
