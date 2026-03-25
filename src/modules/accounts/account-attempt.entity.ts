import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('account_attempts')
export class AccountAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, (a) => a.attempts, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column({ type: 'uuid' })
  accountId!: string;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  @Column({ type: 'varchar', length: 128 })
  ipAddress!: string;

  @CreateDateColumn()
  attemptedAt!: Date;
}
