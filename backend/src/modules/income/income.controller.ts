import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { IncomeService } from './income.service';
import { NetIncomeService } from './net-income.service';
import {
  CreateDeductionDto,
  CreateIncomeSourceDto,
  SetIncomeProfileDto,
  UpdateDeductionDto,
  UpdateIncomeSourceDto,
} from './dto/income.dto';

/** FIN-027 · Perfil de ingresos: perfil laboral, fuentes y deducciones. */
@ApiTags('income')
@UseGuards(JwtAuthGuard)
@Controller('income')
export class IncomeController {
  constructor(
    private readonly income: IncomeService,
    private readonly netIncome: NetIncomeService,
  ) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.netIncome.compute(user.id);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.income.getProfile(user.id);
  }

  @Post('profile')
  setProfile(@CurrentUser() user: AuthUser, @Body() dto: SetIncomeProfileDto) {
    return this.income.setProfile(user.id, dto);
  }

  @Get('sources')
  listSources(@CurrentUser() user: AuthUser) {
    return this.income.listSources(user.id);
  }

  @Post('sources')
  createSource(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeSourceDto) {
    return this.income.createSource(user.id, dto);
  }

  @Patch('sources/:id')
  updateSource(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeSourceDto,
  ) {
    return this.income.updateSource(user.id, id, dto);
  }

  @Delete('sources/:id')
  removeSource(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.income.removeSource(user.id, id);
  }

  @Post('sources/:id/deductions')
  createDeduction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateDeductionDto,
  ) {
    return this.income.createDeduction(user.id, id, dto);
  }

  @Patch('deductions/:id')
  updateDeduction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeductionDto,
  ) {
    return this.income.updateDeduction(user.id, id, dto);
  }

  @Delete('deductions/:id')
  removeDeduction(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.income.removeDeduction(user.id, id);
  }
}
