import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { DrawsModule } from '../draws/draws.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember]),
    forwardRef(() => DrawsModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
