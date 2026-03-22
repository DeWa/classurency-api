import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blocks')
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  height!: number;

  @Column({ type: 'varchar', length: 64 })
  prevHash!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  hash!: string;

  @Column({ type: 'varchar', length: 64 })
  txHash!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
