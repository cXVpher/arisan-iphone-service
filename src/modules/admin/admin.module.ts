import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './services/admin-stats.service';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLog } from './entities/activity-log.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, Group, GroupMember, Payment])],
  controllers: [AdminController],
  providers: [AdminStatsService, ActivityLogService],
  exports: [ActivityLogService],
})
export class AdminModule {}
