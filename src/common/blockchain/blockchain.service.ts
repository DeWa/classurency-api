import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'node:crypto';
import { Repository } from 'typeorm';
import { Block } from './block.entity';

const GENESIS_PREV_HASH = '0'.repeat(64);

@Injectable()
export class BlockchainService {
  constructor(
    @InjectRepository(Block)
    private readonly blocksRepo: Repository<Block>,
  ) {}

  computeTxHash(payload: string, signature: string): string {
    return crypto
      .createHash('sha256')
      .update(payload, 'utf8')
      .update('|', 'utf8')
      .update(signature, 'utf8')
      .digest('hex');
  }

  computeBlockHash(height: number, prevHash: string, txHash: string): string {
    // Canonical block header string for hashing.
    const header = `${height}|${prevHash}|${txHash}`;
    return crypto.createHash('sha256').update(header, 'utf8').digest('hex');
  }

  /**
   * Creates the next block for txHash.
   *
   * Concurrency: uses an advisory transaction lock so two requests can’t
   * produce the same height/prevHash concurrently.
   */
  async appendBlockForTxHash(txHash: string): Promise<Block> {
    return this.blocksRepo.manager.transaction(async (manager) => {
      // A single global chain lock.
      await manager.query(`SELECT pg_advisory_xact_lock(9223372036854775000)`);

      const last = await manager
        .getRepository(Block)
        .createQueryBuilder('b')
        .orderBy('b.height', 'DESC')
        .limit(1)
        .getOne();

      const height = (last?.height ?? 0) + 1;
      const prevHash = last?.hash ?? GENESIS_PREV_HASH;
      const hash = this.computeBlockHash(height, prevHash, txHash);

      const block = manager.getRepository(Block).create({
        height,
        prevHash,
        hash,
        txHash,
      });

      return manager.getRepository(Block).save(block);
    });
  }
}
