import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DrawsModule } from '../draws/draws.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, Ticket, Payment]),
    forwardRef(() => DrawsModule),
    forwardRef(() => AdminModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
