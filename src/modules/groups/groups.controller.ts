import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { SetKetuaDto } from './dto/set-ketua.dto';
import { ActivateGroupDto } from './dto/activate-group.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '../users/entities/user.entity';

@ApiTags('Groups')
@ApiBearerAuth('JWT')
@Controller('groups')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new group (ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Group A',
        description: 'Group description',
        max_members: 10,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all groups' })
  @ApiResponse({
    status: 200,
    description: 'Groups list with members and user details',
    schema: {
      example: {
        data: [
          {
            id: 'group-uuid',
            name: 'Arisan Group A',
            status: 'PENDING',
            max_members: 12,
            created_by: 'user-uuid',
            next_draw_date: null,
            activated_at: null,
            created_at: '2026-03-15T10:00:00Z',
            updated_at: '2026-03-15T10:00:00Z',
            member_count: 2,
            members: [
              {
                id: 'member-uuid-1',
                is_ketua: false,
                joined_at: '2026-03-15T12:54:01Z',
                user: {
                  id: 'user-uuid-1',
                  username: 'johndoe',
                  name: 'John Doe',
                  role: 'member',
                },
              },
              {
                id: 'member-uuid-2',
                is_ketua: false,
                joined_at: '2026-03-15T12:57:31Z',
                user: {
                  id: 'user-uuid-2',
                  username: 'janedoe',
                  name: 'Jane Doe',
                  role: 'member',
                },
              },
            ],
          },
        ],
      },
    },
  })
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID with members' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved with members and user details',
    schema: {
      example: {
        id: 'group-uuid',
        name: 'Arisan Group A',
        status: 'PENDING',
        max_members: 12,
        created_by: 'user-uuid',
        next_draw_date: null,
        activated_at: null,
        created_at: '2026-03-15T10:00:00Z',
        updated_at: '2026-03-15T10:00:00Z',
        member_count: 2,
        members: [
          {
            id: 'member-uuid-1',
            is_ketua: false,
            joined_at: '2026-03-15T12:54:01Z',
            user: {
              id: 'user-uuid-1',
              username: 'johndoe',
              name: 'John Doe',
              role: 'member',
            },
          },
          {
            id: 'member-uuid-2',
            is_ketua: true,
            joined_at: '2026-03-15T12:57:31Z',
            user: {
              id: 'user-uuid-2',
              username: 'janedoe',
              name: 'Jane Doe',
              role: 'member',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a group' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID' })
  @ApiResponse({
    status: 201,
    description: 'User joined group successfully',
    schema: {
      example: {
        id: 'group-member-uuid',
        is_ketua: false,
        joined_at: '2026-03-16T10:00:00Z',
        group: {
          id: 'group-uuid',
          name: 'Arisan Group A',
          status: 'PENDING',
          created_by: 'user-uuid',
        },
        user: {
          id: 'user-uuid',
          username: 'johndoe',
          name: 'John Doe',
          role: 'member',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Group is full or user already joined' })
  join(@Param('id') id: string, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinGroup(id, dto);
  }

  @Patch(':id/members/:memberId/set-ketua')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Set group ketua/leader (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID' })
  @ApiParam({ name: 'memberId', type: String, description: 'Member ID' })
  @ApiResponse({
    status: 200,
    description: 'Ketua set successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  setKetua(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: SetKetuaDto,
  ) {
    return this.groupsService.setKetua(id, memberId, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate group (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group activated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  activate(@Param('id') id: string, @Body() dto: ActivateGroupDto) {
    return this.groupsService.activateGroup(id, dto);
  }
}
