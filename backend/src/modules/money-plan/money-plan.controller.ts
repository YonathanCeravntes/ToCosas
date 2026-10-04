import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { YearPlanService } from '../budget/year-plan.service';
import { cushionTiers } from '../budget/year-plan.util';
import { CashflowPlanService } from '../debts/cashflow-plan.service';
import { CreateAnnualExpenseDto, UpdateAnnualExpenseDto, WindfallSplitDto } from './money-plan.dto';

/** FIN-061 Fase 2.5 · Plata del año: gastos grandes, plata extra y colchón por escalones. */
@ApiTags('plan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plan')
export class MoneyPlanController {
  constructor(
    private readonly year: YearPlanService,
    private readonly cashflow: CashflowPlanService,
  ) {}

  @Get('annual-expenses')
  listAnnual(@CurrentUser() user: AuthUser) {
    return this.year.listAnnual(user.id);
  }

  @Post('annual-expenses')
  createAnnual(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnualExpenseDto) {
    return this.year.createAnnual(user.id, dto);
  }

  @Patch('annual-expenses/:id')
  updateAnnual(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAnnualExpenseDto) {
    return this.year.updateAnnual(user.id, id, dto);
  }

  @Delete('annual-expenses/:id')
  removeAnnual(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.year.removeAnnual(user.id, id);
  }

  @Get('windfalls')
  windfalls(@CurrentUser() user: AuthUser) {
    return this.year.windfalls(user.id);
  }

  @Put('windfalls/:kind')
  setWindfall(@CurrentUser() user: AuthUser, @Param('kind') kind: string, @Body() dto: WindfallSplitDto) {
    return this.year.setWindfall(user.id, kind, dto);
  }

  /**
   * Colchón por escalones en meses de lo esencial (fijos + cuotas + mercado, transporte
   * y salud típicos + gastos grandes del año repartidos). Solo cuentan las cuentas
   * marcadas como fondo de emergencia; las cesantías nunca.
   */
  @Get('cushion')
  async cushion(@CurrentUser() user: AuthUser, @Query('onlyIncome') onlyIncome?: string) {
    const [plan, income] = await Promise.all([
      this.cashflow.forUser(user.id),
      this.year.incomeKind(user.id, onlyIncome === 'true'),
    ]);
    return cushionTiers({
      essentialMonthly: plan.colchonTarget,
      saved: plan.emergencyBalance,
      incomeKind: income.kind,
      onlyIncomeOfHousehold: income.onlyIncomeOfHousehold,
    });
  }
}
