import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blocks')
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'bigint' })
  height!: number;

  @Column({ type: 'text' })
  prevHash!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  blockHash!: string;

  @Column({ type: 'text' })
  merkleRoot!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
