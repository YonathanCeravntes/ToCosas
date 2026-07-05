import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SimulationsService } from './simulations.service';
import { ScenarioParams } from './simulation-engine';

class RunSimulationDto {
  @ApiProperty({
    enum: ['abono_extra', 'nueva_deuda', 'reducir_gastos', 'cambio_ingreso', 'estrategia_deudas', 'vender_activo', 'refinanciar'],
  })
  @IsEnum(['abono_extra', 'nueva_deuda', 'reducir_gastos', 'cambio_ingreso', 'estrategia_deudas', 'vender_activo', 'refinanciar'])
  type!: ScenarioParams['type'];

  @ApiPropertyOptional() @IsOptional() @IsString() debtId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() applyToDebtId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() extraMonthly?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() termMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() rateBasis?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monthlyAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() newMonthlyIncome?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() extraBudget?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() assetValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() newRatePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() newRateBasis?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() newTermMonths?: number;
}

@ApiTags('simulations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('simulations')
export class SimulationsController {
  constructor(private readonly simulations: SimulationsService) {}

  @Post()
  run(@CurrentUser() user: AuthUser, @Body() dto: RunSimulationDto) {
    // El default de rateBasis y el shape final los valida el service/engine.
    const params = {
      ...dto,
      rateBasis: dto.rateBasis ?? 'EA',
      newRateBasis: dto.newRateBasis ?? 'EA',
    } as unknown as ScenarioParams;
    return this.simulations.run(user.id, params, 'app');
  }

  @Get()
  history(@CurrentUser() user: AuthUser) {
    return this.simulations.history(user.id);
  }
}
