import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItemProvider } from '@modules/item-providers/item-provider.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_items_name')
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  value!: number;

  // null => unlimited / not tracked
  @Column({ type: 'int', nullable: true })
  amount!: number | null;

  @ManyToOne(() => ItemProvider, (p) => p.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'providerId' })
  provider!: ItemProvider;

  @Column({ type: 'uuid' })
  @Index()
  providerId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
