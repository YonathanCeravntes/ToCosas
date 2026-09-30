import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SyncService } from './sync.service';
import { PushDto } from './dto/sync.dto';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get('pull')
  pull(@CurrentUser() user: AuthUser, @Query('since') since?: string) {
    return this.sync.pull(user.id, since);
  }

  @Post('push')
  push(@CurrentUser() user: AuthUser, @Body() dto: PushDto) {
    return this.sync.push(user.id, dto);
  }
}
