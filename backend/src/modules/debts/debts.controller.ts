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
import { DebtInsuranceService } from './debt-insurance.service';
import { DebtPrepaymentService } from './debt-prepayment.service';
import { CreateDebtDto, PrepayDto, SimulateExtraDto, UpdateDebtDto } from './dto/debt.dto';
import {
  CreateDebtInsuranceDto,
  UpdateDebtInsuranceDto,
} from './dto/debt-insurance.dto';

@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(
    private readonly debts: DebtsService,
    private readonly insurance: DebtInsuranceService,
    private readonly prepayment: DebtPrepaymentService,
  ) {}

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

  // --- FIN-013 · Seguros del crédito (antes de ':id' para no colisionar) ---

  @Patch('insurances/:insuranceId')
  updateInsurance(
    @CurrentUser() user: AuthUser,
    @Param('insuranceId') insuranceId: string,
    @Body() dto: UpdateDebtInsuranceDto,
  ) {
    return this.insurance.update(user.id, insuranceId, dto);
  }

  @Delete('insurances/:insuranceId')
  removeInsurance(@CurrentUser() user: AuthUser, @Param('insuranceId') insuranceId: string) {
    return this.insurance.remove(user.id, insuranceId);
  }

  @Get(':id/insurances')
  listInsurances(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.insurance.list(user.id, id);
  }

  @Post(':id/insurances')
  createInsurance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateDebtInsuranceDto,
  ) {
    return this.insurance.create(user.id, id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debts.findOne(user.id, id);
  }

  @Get(':id/amortization')
  amortization(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debts.getAmortization(user.id, id);
  }

  // --- FIN-012 · Abono a capital y pago total anticipado (DEC-0012) ---

  /** Preview del abono — misma función pura que el recibo persistido. */
  @Post(':id/prepay-preview')
  prepayPreview(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PrepayDto,
  ) {
    return this.prepayment.preview(user.id, id, dto.amount, dto.effect);
  }

  /** Abono único a capital REAL: persiste y recalcula plazo o cuota. */
  @Post(':id/prepay')
  prepay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PrepayDto,
  ) {
    return this.prepayment.prepay(user.id, id, dto.amount, dto.effect);
  }

  /** Pago total anticipado: liquida por el saldo actual (DEC-0012 §4.5). */
  @Post(':id/payoff')
  payoff(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prepayment.payoff(user.id, id);
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
