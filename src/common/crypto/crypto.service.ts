import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as secp256k1 from '@noble/secp256k1';
import argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as ms from 'ms';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { JwtPayload } from './jwt-payload';
import { TransactionBlockchainPayload } from '@common/blockchain/blockchain.service';

/**
 * @noble/secp256k1 v3 leaves sync hash implementations unset; RFC6979 signing needs SHA-256 and HMAC-SHA256.
 */
secp256k1.hashes.sha256 = (message: Uint8Array): Uint8Array =>
  new Uint8Array(crypto.createHash('sha256').update(message).digest());
secp256k1.hashes.hmacSha256 = (key: Uint8Array, message: Uint8Array): Uint8Array =>
  new Uint8Array(crypto.createHmac('sha256', key).update(message).digest());

export interface GeneratedKeyPair {
  privateKeyHex: string;
  publicKeyHex: string;
}

@Injectable()
export class CryptoService {
  private readonly masterKey: Buffer;
  private readonly cardExportKey: Buffer;

  constructor() {
    const masterKeyEnv = process.env.CLASSURENCY_MASTER_KEY;
    const cardKeyEnv = process.env.CLASSURENCY_CARD_EXPORT_KEY;

    if (!masterKeyEnv || !cardKeyEnv) {
      throw new Error('CLASSURENCY_MASTER_KEY and CLASSURENCY_CARD_EXPORT_KEY must be set');
    }

    this.masterKey = Buffer.from(masterKeyEnv, 'base64');
    this.cardExportKey = Buffer.from(cardKeyEnv, 'base64');

    if (this.masterKey.length !== 32 || this.cardExportKey.length !== 32) {
      throw new Error('Crypto keys must be 32 bytes when base64-decoded');
    }
  }

  generatePin(length = 4): string {
    const digits = '0123456789';
    let pin = '';
    for (let i = 0; i < length; i += 1) {
      const idx = crypto.randomInt(0, digits.length);
      pin += digits[idx];
    }
    return pin;
  }

  /**
   * Generate a random password
   * @param length - The length of the password
   * @returns The generated password
   */
  generateRandomPassword(length = 12): string {
    return crypto.randomBytes(length).toString('hex');
  }

  async hashPin(pin: string): Promise<string> {
    return argon2.hash(pin, { type: argon2.argon2id });
  }

  async verifyPin(hash: string, pin: string): Promise<boolean> {
    return argon2.verify(hash, pin);
  }

  /**
   * Stronger Argon2id parameters than PIN hashing (OWASP-aligned defaults for passwords).
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  generateKeyPair(): GeneratedKeyPair {
    const privateKey = secp256k1.utils.randomSecretKey();
    const privateKeyHex = Buffer.from(privateKey).toString('hex');
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    const publicKeyHex = Buffer.from(publicKey).toString('hex');
    return { privateKeyHex, publicKeyHex };
  }

  publicKeyFromPrivateKeyHex(privateKeyHex: string): string {
    const privateKey = Uint8Array.from(Buffer.from(privateKeyHex, 'hex'));
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    return Buffer.from(publicKey).toString('hex');
  }

  private encryptWithKey(key: Buffer, plaintextHex: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintextHex, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  private decryptWithKey(key: Buffer, data: string): string {
    const buf = Buffer.from(data, 'base64');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  }

  encryptPrivateKeyForCard(privateKeyHex: string): string {
    return this.encryptWithKey(this.cardExportKey, privateKeyHex);
  }

  decryptCardPrivateKey(encrypted: string): string {
    return this.decryptWithKey(this.cardExportKey, encrypted);
  }

  signPayload(privateKeyHex: string, payload: TransactionBlockchainPayload): string {
    const json = JSON.stringify(payload);
    const hash = crypto.createHash('sha256').update(json).digest();
    const privateKey = Uint8Array.from(Buffer.from(privateKeyHex, 'hex'));
    const signature = secp256k1.sign(new Uint8Array(hash), privateKey, { prehash: false });
    return Buffer.from(signature).toString('hex');
  }

  generateJwtToken(payload: JwtPayload, expiresIn: number | ms.StringValue): string {
    return jwt.sign(payload, this.masterKey, {
      expiresIn,
      algorithm: 'HS256',
      subject: payload.userId,
      issuer: 'classurity',
    });
  }

  async verifyJwtToken(token: string): Promise<JwtPayload> {
    const payload = jwt.verify(token, this.masterKey, {
      algorithms: ['HS256'],
    });

    // Use class-validator to validate the payload
    const validatedPayload = plainToInstance(JwtPayload, payload);
    if ((await validate(validatedPayload)).length > 0) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    return validatedPayload;
  }
}
