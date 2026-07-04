import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BudgetService } from './budget.service';
import { CreateFixedItemDto, UpdateFixedItemDto } from './dto/fixed-item.dto';

@ApiTags('budget')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budget')
export class BudgetController {
  constructor(private readonly budget: BudgetService) {}

  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser) {
    return this.budget.monthlySummary(user.id);
  }

  @Post('fixed-items')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFixedItemDto) {
    return this.budget.create(user.id, dto);
  }

  @Get('fixed-items')
  findAll(@CurrentUser() user: AuthUser) {
    return this.budget.findAll(user.id);
  }

  @Patch('fixed-items/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFixedItemDto,
  ) {
    return this.budget.update(user.id, id, dto);
  }

  @Delete('fixed-items/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.budget.remove(user.id, id);
  }
}
