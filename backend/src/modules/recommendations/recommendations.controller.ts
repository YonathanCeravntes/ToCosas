import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RecommendationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { RecommendationsService } from './recommendations.service';

class UpdateRecommendationDto {
  @ApiProperty({ enum: ['seen', 'dismissed', 'done'] })
  @IsEnum(['seen', 'dismissed', 'done'])
  status!: 'seen' | 'dismissed' | 'done';
}

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.recommendations.list(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationDto,
  ) {
    return this.recommendations.setStatus(user.id, id, dto.status as RecommendationStatus);
  }
}
