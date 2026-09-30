import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsISO8601, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { RateKindDto } from './debt.dto';

/**
 * FIN-044 · Nuevas condiciones de un crédito. Todo es opcional: lo que no se envía se
 * conserva. `effectiveFrom` = fecha de la PRIMERA cuota con las condiciones nuevas
 * (por defecto, la próxima cuota). `keepCycle` = el día de pago no cambia.
 */
export class RenegotiateDebtDto {
  @ApiPropertyOptional({ example: 60, description: 'Cuotas que faltan con las nuevas condiciones.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  remainingInstallments?: number;

  @ApiPropertyOptional({ example: 14.5, description: 'Nueva tasa (misma base que la deuda, normalmente % E.A.).' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  interestRate?: number;

  @ApiPropertyOptional({ enum: RateKindDto })
  @IsOptional()
  @IsEnum(RateKindDto)
  rateKind?: RateKindDto;

  @ApiPropertyOptional({ example: 850000, description: 'Cuota pactada. En créditos con plan, si no se da el plazo, se deriva de ella.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  monthlyPayment?: number;

  @ApiPropertyOptional({ example: 60000000, description: 'Saldo recompuesto por la entidad (p. ej. intereses capitalizados).' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  @ApiPropertyOptional({ default: true, description: '¿El día de pago sigue igual?' })
  @IsOptional()
  @IsBoolean()
  keepCycle?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Nuevo día de pago (solo si keepCycle = false).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;

  @ApiPropertyOptional({ example: '2026-11-02', description: '¿Desde cuándo aplica? Fecha de la primera cuota con las condiciones nuevas.' })
  @IsOptional()
  @IsISO8601()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: 'Reestructuración con el banco' })
  @IsOptional()
  @IsString()
  note?: string;
}
