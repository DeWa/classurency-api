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
@Check(`"type" = 'MINT' OR "account" IS NOT NULL`)
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

  // NFC UID used to authenticate the payer (when applicable).
  @Column({ type: 'varchar', length: 128, nullable: true })
  nfcCardUid!: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 16 })
  type!: TransactionType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  blockchainPayload!: string;

  @Column({ type: 'varchar', length: 130 })
  blockchainSignature!: string;

  @OneToOne(() => Block, { nullable: true })
  @JoinColumn({ name: 'blockId' })
  block!: Block | null;

  @CreateDateColumn()
  createdAt!: Date;
}
