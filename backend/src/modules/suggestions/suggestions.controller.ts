import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SuggestionsService } from './suggestions.service';

class CompareStrategyDto {
  @ApiProperty({ example: 200000, description: 'Presupuesto extra mensual' })
  @IsNumber()
  @Min(0)
  extraBudget!: number;
}

@ApiTags('suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SuggestionsController {
  constructor(private readonly suggestions: SuggestionsService) {}

  @Get('suggestions')
  get(@CurrentUser() user: AuthUser) {
    return this.suggestions.getSuggestions(user.id);
  }

  @Post('simulator/strategy')
  compare(@CurrentUser() user: AuthUser, @Body() dto: CompareStrategyDto) {
    return this.suggestions.compareStrategies(user.id, dto.extraBudget);
  }
}
