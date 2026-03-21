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
import { UpdateGroupDto } from './dto/update-group.dto';
import { SetKetuaDto } from './dto/set-ketua.dto';
import { ActivateGroupDto } from './dto/activate-group.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '../users/entities/user.entity';

const groupExample = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'Arisan iPhone 16 Pro Max',
  status: 'pending',
  max_members: 12,
  ticket_price: 500000,
  prize: 'iPhone 16 Pro Max 256GB',
  created_by: '550e8400-e29b-41d4-a716-446655440000',
  next_draw_date: null,
  activated_at: null,
  created_at: '2026-03-15T10:00:00.000Z',
  updated_at: '2026-03-15T10:00:00.000Z',
  member_count: 2,
  members: [
    {
      id: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
      is_ketua: true,
      joined_at: '2026-03-15T12:54:01.000Z',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'johndoe',
        name: 'John Doe',
        role: 'member',
      },
    },
    {
      id: 'a9b8c7d6-e5f4-3210-abcd-ef1234567890',
      is_ketua: false,
      joined_at: '2026-03-15T12:57:31.000Z',
      user: {
        id: '660e8400-e29b-41d4-a716-446655440000',
        username: 'janedoe',
        name: 'Jane Doe',
        role: 'member',
      },
    },
  ],
};

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
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Arisan iPhone 16 Pro Max',
        status: 'pending',
        max_members: 12,
        ticket_price: 500000,
        prize: 'iPhone 16 Pro Max 256GB',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        next_draw_date: null,
        activated_at: null,
        created_at: '2026-03-15T10:00:00.000Z',
        updated_at: '2026-03-15T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: User) {
    return this.groupsService.createGroup(dto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all groups' })
  @ApiResponse({
    status: 200,
    description: 'Groups list with members and user details',
    schema: {
      example: [groupExample],
    },
  })
  findAll() {
    return this.groupsService.findAll();
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get all groups user is member of' })
  @ApiResponse({
    status: 200,
    description: 'User groups retrieved',
    schema: {
      example: [
        {
          ...groupExample,
          is_ketua: false,
          joined_at: '2026-03-15T12:57:31.000Z',
        },
      ],
    },
  })
  findMyGroups(@CurrentUser() user: User) {
    return this.groupsService.findByMember(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID with members' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved with members and user details',
    schema: {
      example: groupExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Group a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found',
        error: 'Not Found',
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id/members/:memberId/set-ketua')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Set group ketua/leader (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID (UUID)' })
  @ApiParam({ name: 'memberId', type: String, description: 'Member ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Ketua set successfully',
    schema: {
      example: {
        id: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
        group_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        is_ketua: true,
        joined_at: '2026-03-15T12:54:01.000Z',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Member not found in group' })
  setKetua(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: SetKetuaDto,
  ) {
    return this.groupsService.setKetua(id, memberId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update group details (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    schema: {
      example: groupExample,
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.updateGroup(id, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate group (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Group ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Group activated successfully',
    schema: {
      example: {
        ...groupExample,
        status: 'active',
        next_draw_date: '2026-04-15T00:00:00.000Z',
        activated_at: '2026-03-15T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Group must have a ketua before activation' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  activate(@Param('id') id: string, @Body() dto: ActivateGroupDto) {
    return this.groupsService.activateGroup(id, dto);
  }
}
