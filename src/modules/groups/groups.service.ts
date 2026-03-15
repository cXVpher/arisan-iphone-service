import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, GroupStatus } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { SetKetuaDto } from './dto/set-ketua.dto';
import { ActivateGroupDto } from './dto/activate-group.dto';
import { DrawsService } from '../draws/draws.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    @Inject(forwardRef(() => DrawsService))
    private readonly drawsService: DrawsService,
  ) {}

  async createGroup(dto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepo.create({
      name: dto.name,
      created_by: dto.created_by,
      status: GroupStatus.PENDING,
    });
    return this.groupRepo.save(group);
  }

  async findAll(): Promise<any[]> {
    const groups = await this.groupRepo.find({ relations: ['members'] });
    return groups.map((g) => ({
      ...g,
      member_count: g.members.length,
    }));
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async joinGroup(groupId: string, dto: JoinGroupDto): Promise<GroupMember> {
    const group = await this.findOne(groupId);

    if (group.status === GroupStatus.FULL) {
      throw new BadRequestException('Group is already full');
    }
    if (group.status === GroupStatus.ACTIVE) {
      throw new BadRequestException('Group is already active, cannot join');
    }

    const existing = await this.memberRepo.findOne({
      where: { group_id: groupId, user_id: dto.user_id },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    const member = this.memberRepo.create({
      group_id: groupId,
      user_id: dto.user_id,
    });
    const saved = await this.memberRepo.save(member);

    // Re-count after save
    const count = await this.memberRepo.count({ where: { group_id: groupId } });
    if (count >= group.max_members) {
      await this.groupRepo.update(groupId, { status: GroupStatus.FULL });
    }

    return saved;
  }

  async setKetua(
    groupId: string,
    memberId: string,
    dto: SetKetuaDto,
  ): Promise<GroupMember> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, group_id: groupId },
    });
    if (!member) {
      throw new NotFoundException(
        `Member ${memberId} not found in group ${groupId}`,
      );
    }
    member.is_ketua = dto.is_ketua;
    return this.memberRepo.save(member);
  }

  async activateGroup(groupId: string, dto: ActivateGroupDto): Promise<Group> {
    const group = await this.findOne(groupId);

    const ketua = group.members.find((m) => m.is_ketua === true);
    if (!ketua) {
      throw new BadRequestException(
        'Group must have a ketua before activation',
      );
    }

    const activatedAt = new Date();

    await this.groupRepo.update(groupId, {
      status: GroupStatus.ACTIVE,
      next_draw_date: new Date(dto.next_draw_date),
      activated_at: activatedAt,
    });

    await this.drawsService.createScheduledDraw(groupId, activatedAt);

    return this.findOne(groupId);
  }
}
