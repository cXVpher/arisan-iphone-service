import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DrawsService } from './draws.service';

@Controller('draws')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DrawsController {
  constructor(private readonly drawsService: DrawsService) {}

  /**
   * POST /draws/:groupId/spin?userId=<ketua_user_id>
   * Trigger the draw spin. Only callable by the ketua.
   */
  @Post(':groupId/spin')
  spin(
    @Param('groupId') groupId: string,
    @Query('userId') userId: string,
  ) {
    return this.drawsService.spin(groupId, userId);
  }

  /**
   * GET /draws/:groupId/result
   * Get the completed draw result (winner info).
   */
  @Get(':groupId/result')
  getResult(@Param('groupId') groupId: string) {
    return this.drawsService.getDrawResult(groupId);
  }

  /**
   * GET /draws/:groupId/history
   * Get all draw records for a group.
   */
  @Get(':groupId/history')
  getHistory(@Param('groupId') groupId: string) {
    return this.drawsService.getHistory(groupId);
  }
}
