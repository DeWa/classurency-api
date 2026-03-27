import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createConfiguredE2eApp } from './e2e-bootstrap';
import { truncateAllE2eTables } from './e2e-db';
import { CryptoService } from '../src/common/crypto/crypto.service';
import { AccountsService } from '../src/modules/accounts/accounts.service';
import { ItemsService } from '../src/modules/items/items.service';
import { User, UserType } from '../src/modules/users/user.entity';
import { Account } from '../src/modules/accounts/account.entity';
import { ItemProvider } from '../src/modules/item-providers/item-provider.entity';
import { ApiTokenPrivilege } from '../src/modules/api-tokens/api-token.entity';

const API_PREFIX = '/api/v1';

function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

async function loginViaApi(app: INestApplication, userName: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post(`${API_PREFIX}/auth/login`)
    .send({ userName, password })
    .expect(200);
  return (response.body as { token: string }).token;
}

type E2eAdminFixture = {
  readonly adminToken: string;
  readonly adminUserId: string;
  readonly adminAccountId: string;
  readonly adminUserName: string;
  readonly adminPassword: string;
};

type E2eProviderFixture = {
  readonly providerUserId: string;
  readonly providerUserName: string;
  readonly providerPassword: string;
  readonly providerToken: string;
  readonly providerAccountId: string;
};

async function seedAdminUser(app: INestApplication): Promise<E2eAdminFixture> {
  const cryptoService: CryptoService = app.get(CryptoService);
  const dataSource: DataSource = app.get(DataSource);
  const accountsService: AccountsService = app.get(AccountsService);
  const userRepo = dataSource.getRepository(User);
  const adminUserName = 'e2e-admin';
  const adminPassword = 'e2e-admin-password-secure';
  const admin = userRepo.create({
    name: 'E2E Admin',
    userName: adminUserName,
    passwordHash: await cryptoService.hashPassword(adminPassword),
    type: UserType.ADMIN,
  });
  await userRepo.save(admin);
  await accountsService.createAccount({ userId: admin.id });
  const accountRepo = dataSource.getRepository(Account);
  const adminAccount = await accountRepo.findOne({ where: { userId: admin.id } });
  if (!adminAccount) {
    throw new Error('E2E: admin account missing after createAccount');
  }
  const adminToken: string = await loginViaApi(app, adminUserName, adminPassword);
  return {
    adminToken,
    adminUserId: admin.id,
    adminAccountId: adminAccount.id,
    adminUserName,
    adminPassword,
  };
}

async function seedProviderUser(app: INestApplication, providerUserName: string): Promise<E2eProviderFixture> {
  const cryptoService: CryptoService = app.get(CryptoService);
  const dataSource: DataSource = app.get(DataSource);
  const accountsService: AccountsService = app.get(AccountsService);
  const userRepo = dataSource.getRepository(User);
  const providerPassword = `${providerUserName}-password-secure`;
  const providerUser = userRepo.create({
    name: providerUserName,
    userName: providerUserName,
    passwordHash: await cryptoService.hashPassword(providerPassword),
    type: UserType.PROVIDER,
  });
  await userRepo.save(providerUser);
  await accountsService.createAccount({ userId: providerUser.id });
  const providerAccount = await dataSource.getRepository(Account).findOne({ where: { userId: providerUser.id } });
  if (!providerAccount) {
    throw new Error('E2E: provider account missing after createAccount');
  }
  const providerToken = await loginViaApi(app, providerUserName, providerPassword);
  return {
    providerUserId: providerUser.id,
    providerUserName,
    providerPassword,
    providerToken,
    providerAccountId: providerAccount.id,
  };
}

describe('API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: E2eAdminFixture;

  beforeAll(async () => {
    app = await createConfiguredE2eApp();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllE2eTables(dataSource);
    admin = await seedAdminUser(app);
  });

  describe('Admin creates user and user changes password', () => {
    it('lets the new user log in, change password, and log in with the new password', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Ada', userName: 'e2e-ada' })
        .expect(201);
      const initialPassword: string = (createResponse.body as { password: string }).password;
      const userId: string = (createResponse.body as { id: string }).id;
      const loginBefore = await loginViaApi(app, 'e2e-ada', initialPassword);
      expect(loginBefore.length).toBeGreaterThan(10);
      const newPassword = 'updated-password-123456';
      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/users/${userId}`)
        .set(bearer(loginBefore))
        .send({ password: newPassword })
        .expect(200);
      const loginAfter = await loginViaApi(app, 'e2e-ada', newPassword);
      expect(loginAfter).not.toEqual(loginBefore);
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/login`)
        .send({ userName: 'e2e-ada', password: initialPassword })
        .expect(401);
    });
  });

  describe('Current user profile', () => {
    it('returns the authenticated user from GET /users/me', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Bob', userName: 'e2e-bob' })
        .expect(201);
      const password: string = (createResponse.body as { password: string }).password;
      const userId: string = (createResponse.body as { id: string }).id;
      const token = await loginViaApi(app, 'e2e-bob', password);
      const meResponse = await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me`)
        .set(bearer(token))
        .expect(200);
      const body = meResponse.body as { id: string; name: string };
      expect(body.id).toBe(userId);
      expect(body.name).toBe('Bob');
    });

    it('includes account summaries when includeAccounts=true', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Carol', userName: 'e2e-carol' })
        .expect(201);
      const password: string = (createResponse.body as { password: string }).password;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: (createResponse.body as { id: string }).id })
        .expect(201);
      const token = await loginViaApi(app, 'e2e-carol', password);
      const meResponse = await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me?includeAccounts=true`)
        .set(bearer(token))
        .expect(200);
      const accounts = (meResponse.body as { accounts?: unknown[] }).accounts;
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts?.length).toBe(1);
    });
  });

  describe('Item providers and items', () => {
    it('allows admin to create an item provider with accountId', async () => {
      const provider = await seedProviderUser(app, 'e2e-provider-admin-create');
      const createProviderRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/item-providers`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Cafeteria', userId: provider.providerUserId, accountId: provider.providerAccountId })
        .expect(201);
      const createProviderBody = createProviderRes.body as {
        id: string;
        userId: string;
        accountId: string;
        name: string;
      };
      expect(createProviderBody.id).toBeTruthy();
      expect(createProviderBody.userId).toBe(provider.providerUserId);
      expect(createProviderBody.accountId).toBe(provider.providerAccountId);
      expect(createProviderBody.name).toBe('Cafeteria');
    });

    it('lets a provider create, list, and get own provider items', async () => {
      const provider = await seedProviderUser(app, 'e2e-provider-owner');
      const providerRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/item-providers`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Provider Shop', userId: provider.providerUserId, accountId: provider.providerAccountId })
        .expect(201);
      const providerId: string = (providerRes.body as { id: string }).id;
      const meRes = await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me`)
        .set(bearer(provider.providerToken))
        .expect(200);
      expect((meRes.body as { providerId?: string }).providerId).toBe(providerId);
      const createItemRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/item-providers/${providerId}/items`)
        .set(bearer(provider.providerToken))
        .send({
          name: 'Juice',
          description: 'Orange',
          value: 3,
          amount: 10,
        })
        .expect(201);
      const createdItem = createItemRes.body as { id: string; name: string; providerId: string };
      expect(createdItem.id).toBeTruthy();
      expect(createdItem.name).toBe('Juice');
      expect(createdItem.providerId).toBe(providerId);
      const listRes = await request(app.getHttpServer())
        .get(`${API_PREFIX}/item-providers/${providerId}/items`)
        .set(bearer(provider.providerToken))
        .expect(200);
      const listedItems = listRes.body as Array<{ id: string }>;
      expect(listedItems.some((item) => item.id === createdItem.id)).toBe(true);
      const getRes = await request(app.getHttpServer())
        .get(`${API_PREFIX}/item-providers/${providerId}/items/${createdItem.id}`)
        .set(bearer(provider.providerToken))
        .expect(200);
      const itemBody = getRes.body as { id: string; providerId: string };
      expect(itemBody.id).toBe(createdItem.id);
      expect(itemBody.providerId).toBe(providerId);
    });

    it('rejects normal user from provider item routes', async () => {
      const userCreate = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Plain User', userName: 'e2e-plain-user' })
        .expect(201);
      const userPassword: string = (userCreate.body as { password: string }).password;
      const userToken = await loginViaApi(app, 'e2e-plain-user', userPassword);
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/item-providers/provider-id/items`)
        .set(bearer(userToken))
        .expect(401);
    });

    it('prevents a provider from managing another provider items', async () => {
      const providerOne = await seedProviderUser(app, 'e2e-provider-one');
      const providerOneEntity = await request(app.getHttpServer())
        .post(`${API_PREFIX}/item-providers`)
        .set(bearer(admin.adminToken))
        .send({
          name: 'Provider One Shop',
          userId: providerOne.providerUserId,
          accountId: providerOne.providerAccountId,
        })
        .expect(201);
      const providerOneProviderId: string = (providerOneEntity.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/item-providers/${providerOneProviderId}/items`)
        .set(bearer(providerOne.providerToken))
        .send({ name: 'Owner Item', description: 'Only owner', value: 2, amount: 5 })
        .expect(201);
      const providerTwo = await seedProviderUser(app, 'e2e-provider-two');
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/item-providers/${providerOneProviderId}/items`)
        .set(bearer(providerTwo.providerToken))
        .expect(400);
    });
  });

  describe('Purchase item', () => {
    it('debits the buyer and credits the provider account', async () => {
      const itemsService: ItemsService = app.get(ItemsService);
      const sellerCreate = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Seller', userName: 'e2e-seller' })
        .expect(201);
      const sellerId: string = (sellerCreate.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: sellerId })
        .expect(201);
      const sellerAccountId: string = await (async (): Promise<string> => {
        const row = await dataSource.getRepository(Account).findOne({ where: { userId: sellerId } });
        if (!row) {
          throw new Error('E2E: seller account not found');
        }
        return row.id;
      })();
      const providerRepo = dataSource.getRepository(ItemProvider);
      const provider = providerRepo.create({
        name: 'Cafeteria',
        userId: sellerId,
        accountId: sellerAccountId,
      });
      await providerRepo.save(provider);
      const item = await itemsService.addItemToProvider(provider.id, 'Juice', 'Orange', 3.0, 10);
      const buyerCreate = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Buyer', userName: 'e2e-buyer' })
        .expect(201);
      const buyerId: string = (buyerCreate.body as { id: string }).id;
      const buyerAccountRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: buyerId })
        .expect(201);
      const buyerAccount = await dataSource.getRepository(Account).findOne({ where: { userId: buyerId } });
      if (!buyerAccount) {
        throw new Error('E2E: buyer account not found');
      }
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/mint`)
        .set(bearer(admin.adminToken))
        .send({
          adminUserAccountId: admin.adminAccountId,
          accountId: buyerAccount.id,
          amount: 50,
          description: 'Test mint for purchase',
        })
        .expect(201);
      const buyerPin: string = (buyerAccountRes.body as { pin: string }).pin;
      const buyerKey: string = (buyerAccountRes.body as { encryptedPrivateKeyForCard: string })
        .encryptedPrivateKeyForCard;
      const buyerLoginToken: string = await loginViaApi(
        app,
        'e2e-buyer',
        (buyerCreate.body as { password: string }).password,
      );
      const purchaseResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/transactions/purchase-item`)
        .set(bearer(buyerLoginToken))
        .send({
          pin: buyerPin,
          encryptedPrivateKeyFromCard: buyerKey,
          providerAccountId: sellerAccountId,
          items: [item.id],
        })
        .expect(201);
      const purchaseBody = purchaseResponse.body as { transactionId: number; remainingAmount: Record<string, number> };
      expect(purchaseBody.transactionId).toBeGreaterThan(0);
      expect(purchaseBody.remainingAmount[item.id]).toBe(9);
      const refreshedBuyer = await dataSource.getRepository(Account).findOne({ where: { id: buyerAccount.id } });
      const refreshedSeller = await dataSource.getRepository(Account).findOne({ where: { id: sellerAccountId } });
      expect(Number(refreshedBuyer?.balance)).toBe(47);
      expect(Number(refreshedSeller?.balance)).toBe(3);
    });
  });

  describe('Admin mint', () => {
    it('increases the target account balance', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Mintee', userName: 'e2e-mintee' })
        .expect(201);
      const userId: string = (userRes.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId })
        .expect(201);
      const account = await dataSource.getRepository(Account).findOne({ where: { userId } });
      if (!account) {
        throw new Error('E2E: mintee account not found');
      }
      const mintRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/mint`)
        .set(bearer(admin.adminToken))
        .send({
          adminUserAccountId: admin.adminAccountId,
          accountId: account.id,
          amount: 12.5,
          description: 'Allowance',
        })
        .expect(201);
      expect((mintRes.body as { balance: string }).balance).toBe('12.50');
    });
  });

  describe('Transfer between users', () => {
    it('moves funds from payer NFC account to recipient account', async () => {
      const aliceRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Alice', userName: 'e2e-alice' })
        .expect(201);
      const bobRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Bob2', userName: 'e2e-bob2' })
        .expect(201);
      const aliceId: string = (aliceRes.body as { id: string }).id;
      const bobId: string = (bobRes.body as { id: string }).id;
      const aliceAccRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: aliceId })
        .expect(201);
      const bobAccRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: bobId })
        .expect(201);
      const aliceAccount = await dataSource.getRepository(Account).findOne({ where: { userId: aliceId } });
      const bobAccount = await dataSource.getRepository(Account).findOne({ where: { userId: bobId } });
      if (!aliceAccount || !bobAccount) {
        throw new Error('E2E: transfer accounts missing');
      }
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/mint`)
        .set(bearer(admin.adminToken))
        .send({
          adminUserAccountId: admin.adminAccountId,
          accountId: aliceAccount.id,
          amount: 20,
        })
        .expect(201);
      const aliceToken = await loginViaApi(app, 'e2e-alice', (aliceRes.body as { password: string }).password);
      const nfcCardUid: string = (aliceAccRes.body as { nfcCardUid: string }).nfcCardUid;
      const pin: string = (aliceAccRes.body as { pin: string }).pin;
      const encKey: string = (aliceAccRes.body as { encryptedPrivateKeyForCard: string }).encryptedPrivateKeyForCard;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/transactions/transfer`)
        .set(bearer(aliceToken))
        .send({
          nfcCardUid,
          toAccountId: bobAccount.id,
          value: 7.25,
          description: 'Split lunch',
          pin,
          encryptedPrivateKeyFromCard: encKey,
        })
        .expect(201);
      const aliceAfter = await dataSource.getRepository(Account).findOne({ where: { id: aliceAccount.id } });
      const bobAfter = await dataSource.getRepository(Account).findOne({ where: { id: bobAccount.id } });
      expect(Number(aliceAfter?.balance)).toBe(12.75);
      expect(Number(bobAfter?.balance)).toBe(7.25);
    });
  });

  describe('Accounts per user', () => {
    it('allows one NFC account per user; a second create for the same user fails', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'OneCard', userName: 'e2e-one-card' })
        .expect(201);
      const userId: string = (userRes.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId });
      expect(second.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Transactions list', () => {
    it('returns recent transactions for the current user', async () => {
      const aliceRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'TxAlice', userName: 'e2e-tx-alice' })
        .expect(201);
      const bobRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'TxBob', userName: 'e2e-tx-bob' })
        .expect(201);
      const aliceId: string = (aliceRes.body as { id: string }).id;
      const bobId: string = (bobRes.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: aliceId })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId: bobId })
        .expect(201);
      const aliceAccount = await dataSource.getRepository(Account).findOne({ where: { userId: aliceId } });
      const bobAccount = await dataSource.getRepository(Account).findOne({ where: { userId: bobId } });
      if (!aliceAccount || !bobAccount) {
        throw new Error('E2E: tx accounts missing');
      }
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/mint`)
        .set(bearer(admin.adminToken))
        .send({
          adminUserAccountId: admin.adminAccountId,
          accountId: aliceAccount.id,
          amount: 5,
        })
        .expect(201);
      const aliceToken = await loginViaApi(app, 'e2e-tx-alice', (aliceRes.body as { password: string }).password);
      const listRes = await request(app.getHttpServer())
        .get(`${API_PREFIX}/transactions`)
        .set(bearer(aliceToken))
        .expect(200);
      const txs = listRes.body as Array<{ type: string; amount: number }>;
      expect(txs.length).toBeGreaterThanOrEqual(1);
      expect(txs.some((t) => t.type === 'MINT')).toBe(true);
    });
  });

  describe('API tokens', () => {
    it('issues a JWT the user can call protected routes with', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Tok', userName: 'e2e-tok' })
        .expect(201);
      const userId: string = (userRes.body as { id: string }).id;
      const password: string = (userRes.body as { password: string }).password;
      const loginToken = await loginViaApi(app, 'e2e-tok', password);
      const tokenRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/tokens`)
        .set(bearer(loginToken))
        .send({ userId, privilege: ApiTokenPrivilege.USER })
        .expect(201);
      const apiToken: string = (tokenRes.body as { token: string }).token;
      const me = await request(app.getHttpServer()).get(`${API_PREFIX}/users/me`).set(bearer(apiToken)).expect(200);
      expect((me.body as { id: string }).id).toBe(userId);
    });
  });

  describe('Authorization', () => {
    it('rejects unauthenticated access to protected routes', async () => {
      await request(app.getHttpServer()).get(`${API_PREFIX}/users/me`).expect(401);
      await request(app.getHttpServer()).post(`${API_PREFIX}/users`).send({ name: 'X', userName: 'x' }).expect(401);
    });

    it('rejects invalid bearer tokens', async () => {
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/me`)
        .set({ Authorization: 'Bearer not-a-real-jwt' })
        .expect(401);
    });

    it('forbids non-admin users from creating users', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'Regular', userName: 'e2e-regular' })
        .expect(201);
      const userToken = await loginViaApi(app, 'e2e-regular', (userRes.body as { password: string }).password);
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(userToken))
        .send({ name: 'Hacker', userName: 'e2e-hacker' })
        .expect(401);
    });

    it('forbids users from reading other users by id (admin-only route)', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'U1', userName: 'e2e-u1' })
        .expect(201);
      const otherRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'U2', userName: 'e2e-u2' })
        .expect(201);
      const userToken = await loginViaApi(app, 'e2e-u1', (userRes.body as { password: string }).password);
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/users/${(otherRes.body as { id: string }).id}`)
        .set(bearer(userToken))
        .expect(401);
    });

    it('forbids updating another user profile even with a valid user token', async () => {
      const a = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'A', userName: 'e2e-patch-a' })
        .expect(201);
      const b = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'B', userName: 'e2e-patch-b' })
        .expect(201);
      const tokenA = await loginViaApi(app, 'e2e-patch-a', (a.body as { password: string }).password);
      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/users/${(b.body as { id: string }).id}`)
        .set(bearer(tokenA))
        .send({ name: 'Nope' })
        .expect(403);
    });

    it('forbids regular users from minting', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'NoMint', userName: 'e2e-nomint' })
        .expect(201);
      const userId: string = (userRes.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(admin.adminToken))
        .send({ userId })
        .expect(201);
      const acc = await dataSource.getRepository(Account).findOne({ where: { userId } });
      const userToken = await loginViaApi(app, 'e2e-nomint', (userRes.body as { password: string }).password);
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/admin/mint`)
        .set(bearer(userToken))
        .send({
          adminUserAccountId: admin.adminAccountId,
          accountId: acc?.id,
          amount: 1,
        })
        .expect(401);
    });

    it('forbids regular users from creating NFC accounts', async () => {
      const userRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'NoAcc', userName: 'e2e-noacc' })
        .expect(201);
      const userToken = await loginViaApi(app, 'e2e-noacc', (userRes.body as { password: string }).password);
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/accounts`)
        .set(bearer(userToken))
        .send({ userId: (userRes.body as { id: string }).id })
        .expect(401);
    });

    it('rejects API token requests for a different user id', async () => {
      const a = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'A', userName: 'e2e-tok-a' })
        .expect(201);
      const b = await request(app.getHttpServer())
        .post(`${API_PREFIX}/users`)
        .set(bearer(admin.adminToken))
        .send({ name: 'B', userName: 'e2e-tok-b' })
        .expect(201);
      const tokenA = await loginViaApi(app, 'e2e-tok-a', (a.body as { password: string }).password);
      await request(app.getHttpServer())
        .post(`${API_PREFIX}/tokens`)
        .set(bearer(tokenA))
        .send({ userId: (b.body as { id: string }).id })
        .expect(401);
    });
  });
});
