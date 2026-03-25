import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Check,
} from 'typeorm';
import { Block } from '@common/blockchain/block.entity';
import { Account } from '@modules/accounts/account.entity';

export type TransactionType = 'MINT' | 'PURCHASE';

@Entity('transactions')
@Check(`"type" = 'MINT' OR "accountId" IS NOT NULL`)
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account?: Account;

  // For transfer-like transactions (e.g. PURCHASE), who receives the funds.
  @ManyToOne(() => Account)
  @JoinColumn({ name: 'toAccountId' })
  toAccount!: Account | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 16 })
  type!: TransactionType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text' })
  txHash!: string;

  @OneToOne(() => Block)
  @JoinColumn({ name: 'blockId' })
  block!: Block;

  @Column({ type: 'varchar', length: 130 })
  blockchainSignature!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
