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
import { DebtsService } from './debts.service';
import { CreateDebtDto, SimulateExtraDto, UpdateDebtDto } from './dto/debt.dto';

@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.debts.summaryForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDebtDto) {
    return this.debts.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.debts.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debts.findOne(user.id, id);
  }

  @Get(':id/amortization')
  amortization(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debts.getAmortization(user.id, id);
  }

  @Post(':id/simulate-extra')
  simulate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SimulateExtraDto,
  ) {
    return this.debts.simulateExtra(user.id, id, dto.extraMonthly);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.debts.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debts.remove(user.id, id);
  }
}
