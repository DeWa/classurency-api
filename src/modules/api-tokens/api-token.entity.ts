import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '@modules/users/user.entity';

export enum ApiTokenPrivilege {
  ADMIN = 'admin',
  PROVIDER = 'provider',
  USER = 'user',
}

export enum ApiTokenType {
  LOGIN = 'login',
  API = 'api',
}

@Entity('api_tokens')
export class ApiToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  privilege!: ApiTokenPrivilege;

  @Column({ type: 'enum', enumName: 'api_token_type', enum: ApiTokenType, default: ApiTokenType.LOGIN })
  type!: ApiTokenType;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
