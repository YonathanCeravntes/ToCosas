import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { InsightStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { InsightsService } from './insights.service';

class UpdateInsightDto {
  @ApiProperty({ enum: ['seen', 'dismissed'] })
  @IsEnum(['seen', 'dismissed'])
  status!: 'seen' | 'dismissed';
}

class PreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  proactiveEnabled?: boolean;
}

@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
    return this.insights.list(user.id, all === 'true');
  }

  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser) {
    return this.insights.preferences(user.id);
  }

  @Patch('preferences')
  setPreferences(@CurrentUser() user: AuthUser, @Body() dto: PreferencesDto) {
    return this.insights.setProactiveEnabled(user.id, dto.proactiveEnabled ?? true);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInsightDto,
  ) {
    return this.insights.setStatus(user.id, id, dto.status as InsightStatus);
  }
}
