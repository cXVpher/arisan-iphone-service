import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

export enum RewardStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

@Entity('referral_rewards')
@Index('idx_referrer_id', ['referrer_id'])
@Unique('uk_ticket_id', ['ticket_id'])
export class ReferralReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 36 })
  referrer_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  @Column('varchar', { length: 36 })
  source_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_user_id' })
  source_user: User;

  @Column('varchar', { length: 36 })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('enum', { enum: RewardStatus, default: RewardStatus.PENDING })
  status: RewardStatus;

  @Column('datetime', { nullable: true })
  paid_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
