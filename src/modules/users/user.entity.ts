import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Account } from '@modules/accounts/account.entity';

export enum UserType {
  USER = 'user',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enumName: 'user_type',
    enum: ['user', 'provider', 'admin'],
    default: 'user',
  })
  type!: UserType;

  @OneToMany(() => Account, (a) => a.user)
  accounts!: Account[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
