import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Account } from '@modules/accounts/account.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum UserType {
  USER = 'user',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'User ID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 128 })
  @Index({ unique: true })
  userName!: string;

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
