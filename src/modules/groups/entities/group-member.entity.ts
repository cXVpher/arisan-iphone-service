import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Group } from './group.entity';

@Entity('group_members')
@Unique(['group_id', 'user_id'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  group_id: string;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ default: false })
  is_ketua: boolean;

  @CreateDateColumn()
  joined_at: Date;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;
}
