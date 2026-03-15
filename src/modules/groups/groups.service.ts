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
    const groups = await this.groupRepo.find({ relations: ['members', 'members.user'] });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      max_members: g.max_members,
      created_by: g.created_by,
      next_draw_date: g.next_draw_date,
      activated_at: g.activated_at,
      created_at: g.created_at,
      updated_at: g.updated_at,
      member_count: g.members.length,
      members: g.members.map((m) => ({
        id: m.id,
        is_ketua: m.is_ketua,
        joined_at: m.joined_at,
        user: {
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          role: m.user.role,
        },
      })),
    }));
  }

  async findOne(id: string): Promise<any> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);

    return {
      id: group.id,
      name: group.name,
      status: group.status,
      max_members: group.max_members,
      created_by: group.created_by,
      next_draw_date: group.next_draw_date,
      activated_at: group.activated_at,
      created_at: group.created_at,
      updated_at: group.updated_at,
      member_count: group.members.length,
      members: group.members.map((m) => ({
        id: m.id,
        is_ketua: m.is_ketua,
        joined_at: m.joined_at,
        user: {
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          role: m.user.role,
        },
      })),
    };
  }

  async joinGroup(groupId: string, dto: JoinGroupDto): Promise<any> {
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

    // Load relations for nested response
    const memberWithRelations = await this.memberRepo.findOne({
      where: { id: saved.id },
      relations: ['group', 'user'],
    });

    if (!memberWithRelations) {
      throw new NotFoundException('Member not found after creation');
    }

    return {
      id: memberWithRelations.id,
      is_ketua: memberWithRelations.is_ketua,
      joined_at: memberWithRelations.joined_at,
      group: {
        id: memberWithRelations.group.id,
        name: memberWithRelations.group.name,
        status: memberWithRelations.group.status,
        created_by: memberWithRelations.group.created_by,
      },
      user: {
        id: memberWithRelations.user.id,
        username: memberWithRelations.user.username,
        name: memberWithRelations.user.name,
        role: memberWithRelations.user.role,
      },
    };
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
