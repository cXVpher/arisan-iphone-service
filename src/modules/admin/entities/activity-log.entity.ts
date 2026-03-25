import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ActivityAction {
  GROUP_CREATED = 'group_created',
  GROUP_UPDATED = 'group_updated',
  GROUP_ACTIVATED = 'group_activated',
  GROUP_COMPLETED = 'group_completed',
  MEMBER_JOINED = 'member_joined',
  MEMBER_REMOVED = 'member_removed',
  KETUA_SET = 'ketua_set',
  PAYMENT_UPLOADED = 'payment_uploaded',
  PAYMENT_VERIFIED = 'payment_verified',
  PAYMENT_REJECTED = 'payment_rejected',
  DRAW_EXECUTED = 'draw_executed',
  TICKET_EXPIRED = 'ticket_expired',
}

export enum ActivityTargetType {
  GROUP = 'group',
  USER = 'user',
  PAYMENT = 'payment',
  TICKET = 'ticket',
}

@Index('idx_created_at', { synchronize: false })
@Index('idx_target', { synchronize: false })
@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  actor_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column('varchar', { length: 50 })
  action: ActivityAction;

  @Column('varchar', { length: 30 })
  targetType: ActivityTargetType;

  @Column('uuid')
  targetId: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;
}
