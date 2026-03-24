import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import { Block } from './block.entity';

const GENESIS_PREV_HASH = '0'.repeat(64);
const TX_HASH_BYTE_LENGTH = 32;

export interface TransactionBlockchainPayload {
  kind: 'MINT' | 'PURCHASE';
  from: string;
  to: string;
  amount: number;
  description?: string;
  timestamp: number;
}

@Injectable()
export class BlockchainService {
  constructor(
    @InjectRepository(Block)
    private readonly blocksRepo: Repository<Block>,
  ) {}

  computeTxHash(payload: TransactionBlockchainPayload, signature: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHash('sha256')
      .update(payloadString, 'utf8')
      .update('|', 'utf8')
      .update(signature, 'utf8')
      .digest('hex');
  }

  /**
   * Computes the Merkle root of a list of transaction hashes (64-char hex, 32 bytes each).
   * Each level hashes the concatenation of the two child digests; an odd count duplicates the last leaf.
   *
   * @param txHashes - The list of transaction hashes.
   * @returns The Merkle root.
   */
  computeMerkleRoot(txHashes: readonly string[]): string {
    if (txHashes.length === 0) {
      return crypto.createHash('sha256').update('', 'utf8').digest('hex');
    }
    let currentLevel: string[] = [...txHashes];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let index: number = 0; index < currentLevel.length; index += 2) {
        const left: string = currentLevel[index];
        const right: string = currentLevel[index + 1] ?? left;
        nextLevel.push(this.hashMerklePair(left, right));
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  private hashMerklePair(leftHex: string, rightHex: string): string {
    const left = Buffer.from(leftHex, 'hex');
    const right = Buffer.from(rightHex, 'hex');
    if (left.length !== TX_HASH_BYTE_LENGTH || right.length !== TX_HASH_BYTE_LENGTH) {
      throw new Error('Each transaction hash must be a 64-character hex string (32 bytes).');
    }
    return crypto
      .createHash('sha256')
      .update(Buffer.concat([left, right]))
      .digest('hex');
  }

  computeBlockHash(height: number, prevHash: string, merkleRoot: string): string {
    // Canonical block header string for hashing.
    const header = `${height}|${prevHash}|${merkleRoot}`;
    return crypto.createHash('sha256').update(header, 'utf8').digest('hex');
  }

  /**
   * Creates the next block for txHash.
   *
   * Concurrency: uses an advisory transaction lock so two requests can’t
   * produce the same height/prevHash concurrently.
   *
   * @param txHash - Transaction hash to anchor in the chain.
   * @param existingManager - When provided, runs inside that unit of work (e.g. an outer
   *   `DataSource.transaction`). Omit to start a dedicated transaction (e.g. after another tx commits).
   */
  async appendBlockForTxHash(txHash: string, existingManager?: EntityManager): Promise<Block> {
    const append = async (manager: EntityManager): Promise<Block> => {
      await manager.query(`SELECT pg_advisory_xact_lock(9223372036854775000)`);
      const last = await manager
        .getRepository(Block)
        .createQueryBuilder('b')
        .orderBy('b.height', 'DESC')
        .limit(1)
        .getOne();
      const height = (last?.height ?? 0) + 1;
      const prevHash = last?.blockHash ?? GENESIS_PREV_HASH;
      const merkleRoot = this.computeMerkleRoot([txHash]);
      const blockHash = this.computeBlockHash(height, prevHash, merkleRoot);
      const block = manager.getRepository(Block).create({
        height,
        prevHash,
        blockHash,
        merkleRoot,
      });
      return manager.getRepository(Block).save(block);
    };
    if (existingManager) {
      return append(existingManager);
    }
    return this.blocksRepo.manager.transaction(async (manager) => append(manager));
  }
}
