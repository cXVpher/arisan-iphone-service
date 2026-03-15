import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';

export enum TicketStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  ACTIVE = 'active',
  WON = 'won',
  EXPIRED = 'expired',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  ticket_code: string;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'varchar', length: 36 })
  group_id: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.PENDING_PAYMENT,
  })
  status: TicketStatus;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;
}
