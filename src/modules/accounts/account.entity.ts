import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@modules/users/user.entity';
import { AccountAttempt } from './account-attempt.entity';

@Entity('accounts')
@Unique(['nfcCardUid'])
@Unique(['userId'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (u) => u.accounts, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  nfcCardUid!: string | null;

  @Column({ type: 'text' })
  pinHash!: string;

  @Column({ type: 'varchar', length: 130 })
  publicKeyHex!: string;

  @Column({ type: 'text' })
  encryptedPrivateKey!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'boolean', default: false })
  isLocked!: boolean;

  @OneToMany(() => AccountAttempt, (a) => a.account)
  attempts!: AccountAttempt[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
