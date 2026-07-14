import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { NormalizeNumber } from '../../../common/parse-number.util';

export enum DebtTypeDto {
  tarjeta_credito = 'tarjeta_credito',
  credito_personal = 'credito_personal',
  hipotecario = 'hipotecario',
  libre_inversion = 'libre_inversion',
  vehiculo = 'vehiculo',
  educativo = 'educativo',
  gota_a_gota = 'gota_a_gota',
  prestamo_familiar = 'prestamo_familiar',
  otro = 'otro',
}

export enum RateBasisDto {
  EA = 'EA',
  MV = 'MV',
  NMV = 'NMV',
  NAMV = 'NAMV',
}

export enum AmortSystemDto {
  frances = 'frances',
  aleman = 'aleman',
}

export class CreateDebtDto {
  @ApiProperty({ example: 'Crédito casa' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ enum: DebtTypeDto, default: DebtTypeDto.otro })
  @IsEnum(DebtTypeDto)
  debtType!: DebtTypeDto;

  @ApiProperty({ example: 60000000 })
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  originalAmount!: number;

  @ApiProperty({ example: 49000000 })
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  currentBalance!: number;

  @ApiProperty({ example: '2023-01-15' })
  @IsISO8601()
  startDate!: string;

  @ApiProperty({ example: 180 })
  @NormalizeNumber()
  @IsInt()
  @IsPositive()
  termMonths!: number;

  // BT-001: `interestRate` es Decimal(7,4) en BD (máx 999.9999). El @Max evita
  // que un valor fuera de rango desborde la columna y produzca un 500 — devuelve
  // un 400 claro. @NormalizeNumber acepta "15,35"/"15.35"/"1535" (formato regional).
  @ApiProperty({ example: 12.5, description: 'Tasa en porcentaje' })
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  @Max(999.9999)
  interestRate!: number;

  @ApiProperty({ enum: RateBasisDto, default: RateBasisDto.EA })
  @IsEnum(RateBasisDto)
  rateBasis!: RateBasisDto;

  @ApiPropertyOptional({ enum: AmortSystemDto, default: AmortSystemDto.frances })
  @IsOptional()
  @IsEnum(AmortSystemDto)
  amortSystem?: AmortSystemDto;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 31 })
  @IsOptional()
  @NormalizeNumber()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateDebtDto extends PartialType(CreateDebtDto) {}

export class SimulateExtraDto {
  @ApiProperty({ example: 100000 })
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  extraMonthly!: number;
}

/** FIN-012 · Abono único a capital (DEC-0012 §4.2). */
export enum PrepayEffectDto {
  reducir_plazo = 'reducir_plazo',
  reducir_cuota = 'reducir_cuota',
}

export class PrepayDto {
  @ApiProperty({ example: 2000000, description: 'Monto del abono a capital' })
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: PrepayEffectDto, default: PrepayEffectDto.reducir_plazo })
  @IsOptional()
  @IsEnum(PrepayEffectDto)
  effect: 'reducir_plazo' | 'reducir_cuota' = 'reducir_plazo';
}
