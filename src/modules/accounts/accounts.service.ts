import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { User } from '@modules/users/user.entity';
import { Account } from './account.entity';
import { AccountAttempt } from './account-attempt.entity';
import { CreateAccountDto, CreateAccountResponseDto } from './dto/create-account.dto';
import { CheckBalanceDto } from './dto/check-balance.dto';
import {
  DEFAULT_LIST_ACCOUNTS_LIMIT,
  ListAccountsQueryDto,
  ListAccountsResponseDto,
  MAX_LIST_ACCOUNTS_LIMIT,
} from './dto/list-accounts.dto';
import { UpdateAccountAdminDto } from './dto/update-account-admin.dto';
import * as crypto from 'node:crypto';

/** Maximum recent failed login attempts before the account is locked. */
const MAX_FAILED_LOGIN_ATTEMPTS_BEFORE_LOCKOUT = 3;

/** Only failed attempts at or after this age cutoff count toward lockout. */
const FAILED_LOGIN_ATTEMPT_RECENCY_MS = 15 * 60 * 1000;

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepo: Repository<Account>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(AccountAttempt)
    private readonly accountAttemptsRepo: Repository<AccountAttempt>,
    private readonly cryptoService: CryptoService,
  ) {}

  async createAccount(dto: CreateAccountDto): Promise<CreateAccountResponseDto> {
    const pin = this.cryptoService.generatePin();
    const pinHash = await this.cryptoService.hashPin(pin);
    const { privateKeyHex, publicKeyHex } = this.cryptoService.generateKeyPair();

    const encryptedPrivateKey = this.cryptoService.encryptPrivateKeyForCard(privateKeyHex);
    const cardEncryptedPrivateKey = this.cryptoService.encryptPrivateKeyForCard(privateKeyHex);
    const nfcCardUid = crypto.randomUUID();

    const user = await this.usersRepo.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = this.accountsRepo.create({
      userId: user.id,
      pinHash,
      nfcCardUid,
      publicKeyHex,
      encryptedPrivateKey,
      balance: 0,
    });

    await this.accountsRepo.save(account);

    return {
      id: user.id,
      name: user.name,
      nfcCardUid,
      publicKeyHex,
      pin,
      encryptedPrivateKeyForCard: cardEncryptedPrivateKey,
    };
  }

  /**
   * Lists accounts for an admin with optional filters and pagination; includes owner (user) metadata.
   * @param query - Filters and pagination.
   * @returns Matching accounts with owners and total count.
   */
  async listAccountsAsAdmin(query: ListAccountsQueryDto): Promise<ListAccountsResponseDto> {
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIST_ACCOUNTS_LIMIT, 1), MAX_LIST_ACCOUNTS_LIMIT);
    const offset = query.offset ?? 0;
    const qb = this.accountsRepo
      .createQueryBuilder('account')
      .innerJoin('account.user', 'owner')
      .select([
        'account.id',
        'account.userId',
        'account.nfcCardUid',
        'account.publicKeyHex',
        'account.balance',
        'account.isLocked',
        'account.createdAt',
        'account.updatedAt',
      ])
      .addSelect(['owner.id', 'owner.name', 'owner.userName', 'owner.type', 'owner.createdAt', 'owner.updatedAt']);
    if (query.userId !== undefined) {
      qb.andWhere('account.userId = :userId', { userId: query.userId });
    }
    if (query.ownerType !== undefined) {
      qb.andWhere('owner.type = :ownerType', { ownerType: query.ownerType });
    }
    if (query.isLocked !== undefined) {
      qb.andWhere('account.isLocked = :isLocked', { isLocked: query.isLocked });
    }
    if (query.search !== undefined && query.search.length > 0) {
      const term = `%${query.search}%`;
      qb.andWhere('(account.nfcCardUid ILIKE :term OR owner.name ILIKE :term OR owner.userName ILIKE :term)', { term });
    }
    qb.orderBy('account.createdAt', 'DESC').skip(offset).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      accounts: rows.map((account) => {
        const owner = account.user!;
        return {
          id: account.id,
          userId: account.userId,
          nfcCardUid: account.nfcCardUid,
          publicKeyHex: account.publicKeyHex,
          balance: Number(account.balance),
          isLocked: account.isLocked,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          owner: {
            id: owner.id,
            name: owner.name,
            userName: owner.userName,
            type: owner.type,
            createdAt: owner.createdAt,
            updatedAt: owner.updatedAt,
          },
        };
      }),
      total,
    };
  }

  /**
   * Updates admin-editable fields on an account (for example lock state).
   */
  async updateAccountAsAdmin(accountId: string, dto: UpdateAccountAdminDto): Promise<Account> {
    const hasUpdate = dto.isLocked !== undefined;
    if (!hasUpdate) {
      throw new BadRequestException('At least one field must be provided');
    }
    const account = await this.accountsRepo.findOne({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    if (dto.isLocked !== undefined) {
      account.isLocked = dto.isLocked;
    }
    return this.accountsRepo.save(account);
  }

  async checkBalance(dto: CheckBalanceDto, ipAddress: string) {
    const account = await this.accountsRepo.findOne({
      where: { nfcCardUid: dto.nfcCardUid },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const loginOk = await this.checkAccountLogin(account, dto.pin, dto.encryptedPrivateKeyFromCard, ipAddress);
    if (!loginOk) {
      throw new BadRequestException('Invalid credentials');
    }

    return { balance: account.balance };
  }

  /**
   * Checks if the login is successful for an account and locks the account after too many recent failed attempts (counted in the database).
   * @param account - The account to check the login for
   * @param pin - The PIN to check
   * @param encryptedPrivateKey - The encrypted private key to check
   * @param ipAddress - The IP address of the request
   * @returns True if the login is successful, false otherwise
   */
  async checkAccountLogin(
    account: Account,
    pin: string,
    encryptedPrivateKey: string,
    ipAddress: string,
  ): Promise<boolean> {
    if (account.isLocked) {
      return false;
    }

    const privateKeyHex = this.cryptoService.decryptCardPrivateKey(encryptedPrivateKey);
    const derivedPublicKey = this.cryptoService.publicKeyFromPrivateKeyHex(privateKeyHex);

    const pinOk = await this.cryptoService.verifyPin(account.pinHash, pin);
    const keyPairOk = derivedPublicKey === account.publicKeyHex;

    if (!pinOk || !keyPairOk) {
      let didLockAccount = false;
      await this.accountsRepo.manager.transaction(async (manager: EntityManager) => {
        const attemptsRepo = manager.getRepository(AccountAttempt);
        const attemptRecord = attemptsRepo.create({
          accountId: account.id,
          ipAddress,
          success: false,
        });
        await attemptsRepo.save(attemptRecord);
        const since = new Date(Date.now() - FAILED_LOGIN_ATTEMPT_RECENCY_MS);
        const failedCount = await attemptsRepo
          .createQueryBuilder('attempt')
          .where('attempt.accountId = :accountId', { accountId: account.id })
          .andWhere('attempt.success = :success', { success: false })
          .andWhere('attempt.attemptedAt >= :since', { since })
          .getCount();
        if (failedCount >= MAX_FAILED_LOGIN_ATTEMPTS_BEFORE_LOCKOUT) {
          await manager.getRepository(Account).update({ id: account.id }, { isLocked: true });
          didLockAccount = true;
        }
      });
      if (didLockAccount) {
        account.isLocked = true;
      }
      return false;
    } else {
      const attemptRecord = this.accountAttemptsRepo.create({
        accountId: account.id,
        ipAddress,
        success: true,
      });
      await this.accountAttemptsRepo.save(attemptRecord);
      return true;
    }
  }
}
