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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { SetKetuaDto } from './dto/set-ketua.dto';
import { ActivateGroupDto } from './dto/activate-group.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '../users/entities/user.entity';

@Controller('groups')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(dto);
  }

  @Get()
  @Public()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinGroup(id, dto);
  }

  @Patch(':id/members/:memberId/set-ketua')
  @Roles(Role.ADMIN)
  setKetua(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: SetKetuaDto,
  ) {
    return this.groupsService.setKetua(id, memberId, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string, @Body() dto: ActivateGroupDto) {
    return this.groupsService.activateGroup(id, dto);
  }
}
