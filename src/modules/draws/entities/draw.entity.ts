import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DrawStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
}

@Entity('draws')
export class Draw {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  group_id: string;

  @Column({ type: 'enum', enum: DrawStatus, default: DrawStatus.SCHEDULED })
  status: DrawStatus;

  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  winner_user_id: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  winner_ticket_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  drawn_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
