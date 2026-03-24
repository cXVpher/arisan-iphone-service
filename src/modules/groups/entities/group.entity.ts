import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from './group-member.entity';

export enum GroupStatus {
  PENDING = 'pending',
  FULL = 'full',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.PENDING })
  status: GroupStatus;

  @Column({ default: 12 })
  max_members: number;

  @Column({ type: 'date', nullable: true })
  next_draw_date: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  activated_at: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ticket_price: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  prize: string | null;

  @Column({ type: 'boolean', default: false })
  is_hidden: boolean;

  @Column({ type: 'varchar', length: 36 })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => GroupMember, (member) => member.group, { cascade: true })
  members: GroupMember[];
}
