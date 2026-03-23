/**
 * Seed basic development data (users, accounts, and login tokens).
 *
 * Run from repo root:
 *   npm run db:seed:dev
 *
 * Requirements:
 * - Migrations should be applied (`npm run migration:run`).
 * - Env vars must include:
 *   - CLASSURENCY_MASTER_KEY (base64)
 *   - CLASSURENCY_CARD_EXPORT_KEY (base64)
 *   - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (or defaults)
 */
import 'reflect-metadata';
import { parseArgs } from 'node:util';
import ms from 'ms';
import { AppDataSource } from '../ormconfig';
import { CryptoService } from '@common/crypto/crypto.service';
import { JwtPayload } from '@common/crypto/jwt-payload';
import { mapUserToApiTokenPrivilege } from '@common/mappers';
import { ApiToken, ApiTokenPrivilege, ApiTokenType } from '@modules/api-tokens/api-token.entity';
import { Account } from '@modules/accounts/account.entity';
import { User, UserType } from '@modules/users/user.entity';

type SeedUserConfig = {
  readonly name: string;
  readonly userName: string;
  readonly password: string;
  readonly userType: UserType;
};

type SeedAccountConfig = {
  readonly nfcCardUid: string;
  readonly pin: string;
  readonly initialBalance: number;
};

type SeedConfig = {
  readonly admin: SeedUserConfig;
  readonly adminAccount: SeedAccountConfig;
  readonly user: SeedUserConfig;
  readonly userAccount: SeedAccountConfig;
};

function createJwtPayload(args: {
  userId: string;
  userType: UserType;
  tokenId: string;
  privilege: ApiTokenPrivilege;
  type: ApiTokenType;
}): JwtPayload {
  // jsonwebtoken expects a plain object; class instances fail the check.
  const payload: JwtPayload = {
    userId: args.userId,
    userType: args.userType,
    tokenId: args.tokenId,
    privilege: args.privilege,
    type: args.type,
  };
  return payload;
}

async function upsertUser(params: {
  cryptoService: CryptoService;
  userRepo: ReturnType<typeof AppDataSource.getRepository<User>>;
  config: SeedUserConfig;
}): Promise<User> {
  const existing: User | null = await params.userRepo.findOne({ where: { userName: params.config.userName } });
  const passwordHash: string = await params.cryptoService.hashPassword(params.config.password);
  const user: User = existing ?? params.userRepo.create();
  user.name = params.config.name;
  user.userName = params.config.userName;
  user.passwordHash = passwordHash;
  user.type = params.config.userType;
  await params.userRepo.save(user);
  return user;
}

async function upsertAccount(params: {
  cryptoService: CryptoService;
  accountRepo: ReturnType<typeof AppDataSource.getRepository<Account>>;
  user: User;
  config: SeedAccountConfig;
}): Promise<{ account: Account; encryptedPrivateKeyForCard: string }> {
  const pinHash: string = await params.cryptoService.hashPin(params.config.pin);
  const keyPair = params.cryptoService.generateKeyPair();
  const encryptedPrivateKey: string = params.cryptoService.encryptPrivateKeyForStorage(keyPair.privateKeyHex);
  const encryptedPrivateKeyForCard: string = params.cryptoService.encryptPrivateKeyForCard(keyPair.privateKeyHex);
  const publicKeyHex: string = keyPair.publicKeyHex;

  const existing: Account | null = await params.accountRepo.findOne({ where: { userId: params.user.id } });
  const account: Account = existing ?? params.accountRepo.create();
  account.userId = params.user.id;
  account.nfcCardUid = params.config.nfcCardUid;
  account.pinHash = pinHash;
  account.publicKeyHex = publicKeyHex;
  account.encryptedPrivateKey = encryptedPrivateKey;
  account.balance = params.config.initialBalance;
  account.isLocked = false;
  await params.accountRepo.save(account);
  return { account, encryptedPrivateKeyForCard };
}

async function upsertLoginToken(params: {
  cryptoService: CryptoService;
  apiTokensRepo: ReturnType<typeof AppDataSource.getRepository<ApiToken>>;
  user: User;
}): Promise<string> {
  const privilege: ApiTokenPrivilege = mapUserToApiTokenPrivilege(params.user.type);
  const expirationTime: ms.StringValue = '180d';
  const expiresAt: Date = new Date(Date.now() + ms(expirationTime));

  const existing: ApiToken | null = await params.apiTokensRepo.findOne({
    where: { userId: params.user.id, type: ApiTokenType.LOGIN, revokedAt: undefined },
    order: { createdAt: 'DESC' },
  });
  if (existing) {
    await params.apiTokensRepo.update({ id: existing.id }, { revokedAt: new Date() });
  }

  const token: ApiToken = params.apiTokensRepo.create({
    userId: params.user.id,
    privilege,
    type: ApiTokenType.LOGIN,
    expiresAt,
    revokedAt: null,
  });
  await params.apiTokensRepo.save(token);

  const jwtPayload: JwtPayload = createJwtPayload({
    userId: params.user.id,
    userType: params.user.type,
    tokenId: token.id,
    privilege,
    type: ApiTokenType.LOGIN,
  });

  return params.cryptoService.generateJwtToken(jwtPayload, expirationTime);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'admin-user-name': { type: 'string' },
      'admin-password': { type: 'string' },
      'user-user-name': { type: 'string' },
      'user-password': { type: 'string' },
    },
    strict: false,
  });

  const config: SeedConfig = {
    admin: {
      name: 'Dev Admin',
      userName: (values['admin-user-name'] as string | undefined) ?? 'dev-admin',
      password: (values['admin-password'] as string | undefined) ?? 'dev-admin-password',
      userType: UserType.ADMIN,
    },
    adminAccount: {
      nfcCardUid: 'dev-card-admin',
      pin: '1234',
      initialBalance: 100,
    },
    user: {
      name: 'Dev User',
      userName: (values['user-user-name'] as string | undefined) ?? 'dev-user',
      password: (values['user-password'] as string | undefined) ?? 'dev-user-password',
      userType: UserType.USER,
    },
    userAccount: {
      nfcCardUid: 'dev-card-user',
      pin: '1234',
      initialBalance: 25,
    },
  };

  await AppDataSource.initialize();
  const cryptoService: CryptoService = new CryptoService();

  const userRepo = AppDataSource.getRepository<User>(User);
  const accountRepo = AppDataSource.getRepository<Account>(Account);
  const apiTokensRepo = AppDataSource.getRepository<ApiToken>(ApiToken);

  const adminUser: User = await upsertUser({ cryptoService, userRepo, config: config.admin });
  const { encryptedPrivateKeyForCard: adminEncryptedPrivateKeyForCard } = await upsertAccount({
    cryptoService,
    accountRepo,
    user: adminUser,
    config: config.adminAccount,
  });
  const adminToken: string = await upsertLoginToken({ cryptoService, apiTokensRepo, user: adminUser });

  const userUser: User = await upsertUser({ cryptoService, userRepo, config: config.user });
  const { encryptedPrivateKeyForCard: userEncryptedPrivateKeyForCard } = await upsertAccount({
    cryptoService,
    accountRepo,
    user: userUser,
    config: config.userAccount,
  });
  const userToken: string = await upsertLoginToken({ cryptoService, apiTokensRepo, user: userUser });

  await AppDataSource.destroy();

  console.log('Dev DB seed complete. Use these credentials:');
  console.log(`Admin user: userName=${config.admin.userName} password=${config.admin.password}`);
  console.log(
    `Admin account: userId=${adminUser.id} nfcCardUid=${config.adminAccount.nfcCardUid} pin=${
      config.adminAccount.pin
    } balance=${config.adminAccount.initialBalance}`,
  );
  console.log(`Admin encryptedPrivateKeyForCard=${adminEncryptedPrivateKeyForCard}`);
  console.log(`Admin login token (Authorization Bearer): ${adminToken}`);
  console.log(`User user: userName=${config.user.userName} password=${config.user.password}`);
  console.log(
    `User account: userId=${userUser.id} nfcCardUid=${config.userAccount.nfcCardUid} pin=${
      config.userAccount.pin
    } balance=${config.userAccount.initialBalance}`,
  );
  console.log(`User encryptedPrivateKeyForCard=${userEncryptedPrivateKeyForCard}`);
  console.log(`User login token (Authorization Bearer): ${userToken}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
