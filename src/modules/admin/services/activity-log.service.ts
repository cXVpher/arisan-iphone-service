import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ActivityLog, ActivityAction, ActivityTargetType } from '../entities/activity-log.entity';

export interface LogActivityInput {
  actorId: string;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: string;
  metadata?: Record<string, any>;
}

export interface ActivityItem {
  id: string;
  action: ActivityAction;
  target_type: ActivityTargetType;
  target_id: string;
  metadata: Record<string, any>;
  actor: {
    id: string;
    name: string;
    username: string;
  };
  created_at: Date;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  async log(input: LogActivityInput): Promise<ActivityLog> {
    const log = this.activityLogRepo.create();
    log.actor_id = input.actorId;
    log.action = input.action;
    log.targetType = input.targetType;
    log.targetId = input.targetId;
    log.metadata = input.metadata || null;
    return this.activityLogRepo.save(log);
  }

  async findRecent(
    limit: number = 20,
    cursor?: string,
    action?: ActivityAction,
  ): Promise<{
    items: ActivityItem[];
    next_cursor: string | null;
    has_more: boolean;
  }> {
    const query = this.activityLogRepo
      .createQueryBuilder('al')
      .leftJoinAndSelect('al.actor', 'actor')
      .select([
        'al.id',
        'al.action',
        'al.targetType',
        'al.targetId',
        'al.metadata',
        'al.created_at',
        'actor.id',
        'actor.name',
        'actor.username',
      ]);

    if (cursor) {
      query.where('al.id < :cursor', { cursor });
    }

    if (action) {
      query.andWhere('al.action = :action', { action });
    }

    // Fetch limit + 1 to determine if there are more records
    const results = await query
      .orderBy('al.created_at', 'DESC')
      .addOrderBy('al.id', 'DESC')
      .take(limit + 1)
      .getMany();

    const hasMore = results.length > limit;
    const items = results.slice(0, limit);

    const mapped: ActivityItem[] = items.map((log: any) => ({
      id: log.id,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId,
      metadata: log.metadata || {},
      actor: {
        id: log.actor?.id,
        name: log.actor?.name,
        username: log.actor?.username,
      },
      created_at: log.created_at,
    }));

    return {
      items: mapped,
      next_cursor: hasMore ? items[items.length - 1].id : null,
      has_more: hasMore,
    };
  }
}
