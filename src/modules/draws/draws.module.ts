import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Draw } from './entities/draw.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { DrawsController } from './draws.controller';
import { DrawsService } from './draws.service';

@Module({
  imports: [TypeOrmModule.forFeature([Draw, Group, GroupMember, Ticket])],
  controllers: [DrawsController],
  providers: [DrawsService],
  exports: [DrawsService],
})
export class DrawsModule {}
