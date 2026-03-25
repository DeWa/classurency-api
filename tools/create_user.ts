/**
 * Create the first admin user (CLI).
 *
 * Run from repo root:
 *   npx ts-node -r tsconfig-paths/register tools/create_user.ts --name "Admin" --user-name admin --password 'your-password'
 */
import 'reflect-metadata';
import { parseArgs } from 'node:util';
import argon2 from 'argon2';
import { AppDataSource } from '../ormconfig';
import { User, UserType } from '@modules/users/user.entity';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string', short: 'n' },
      'user-name': { type: 'string', short: 'u' },
      password: { type: 'string', short: 'p' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`Usage:
  npx ts-node -r tsconfig-paths/register tools/create_user.ts \\
    --name <display name> --user-name <login> --password <password>

Options:
  -n, --name        Display name (required)
  -u, --user-name   Unique login (required)
  -p, --password    Password (required)
  -h, --help        Show this help
`);
    process.exit(0);
  }

  const name = values.name?.trim();
  const userName = values['user-name']?.trim();
  const password = values.password;

  if (!name || !userName || !password) {
    console.error('Error: --name, --user-name, and --password are required. Use --help for usage.');
    process.exit(1);
  }

  await AppDataSource.initialize();

  const existing = await AppDataSource.getRepository(User).findOne({ where: { userName } });
  if (existing) {
    console.error(`Error: user name "${userName}" is already taken.`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = AppDataSource.getRepository(User).create({
    name,
    userName,
    passwordHash,
    type: UserType.ADMIN,
  });
  await AppDataSource.getRepository(User).save(user);

  console.log(`Admin user created: id=${user.id} userName=${user.userName}`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
