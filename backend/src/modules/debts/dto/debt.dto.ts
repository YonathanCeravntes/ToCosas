import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
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
  // FIN-032: catálogo de 1ª clase.
  libranza = 'libranza',
  compra_a_cuotas = 'compra_a_cuotas',
  fintech = 'fintech',
}

export enum RateBasisDto {
  EA = 'EA',
  MV = 'MV',
  NMV = 'NMV',
  NAMV = 'NAMV',
}

export enum RateKindDto {
  fija = 'fija',
  variable = 'variable',
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

  // FIN-031: una tarjeta de crédito nace con saldo 0 — su saldo real se DERIVA
  // de las compras (CardService, §32). Por eso 0 es válido (antes @IsPositive).
  @ApiProperty({ example: 60000000 })
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  originalAmount!: number;

  @ApiProperty({ example: 49000000 })
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  currentBalance!: number;

  @ApiProperty({ example: '2023-01-15' })
  @IsISO8601()
  startDate!: string;

  // FIN-032: opcional a nivel DTO — el servicio lo EXIGE solo para los tipos
  // `amortizado` (según el descriptor); un gota a gota / tarjeta no lo necesita.
  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @NormalizeNumber()
  @IsInt()
  @IsPositive()
  termMonths?: number;

  // BT-001: `interestRate` es Decimal(7,4) en BD (máx 999.9999). El @Max evita
  // que un valor fuera de rango desborde la columna y produzca un 500 — devuelve
  // un 400 claro. @NormalizeNumber acepta "15,35"/"15.35"/"1535" (formato regional).
  // FIN-032: opcional — informal (interés pactado/opcional) y tarjeta pueden no
  // declararla; el servicio la trata como 0 si falta.
  @ApiPropertyOptional({ example: 12.5, description: 'Tasa en porcentaje' })
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  @Max(999.9999)
  interestRate?: number;

  @ApiPropertyOptional({ enum: RateBasisDto, default: RateBasisDto.EA })
  @IsOptional()
  @IsEnum(RateBasisDto)
  rateBasis?: RateBasisDto;

  // FIN-032: hipoteca declara fija/variable; el resto queda fija por defecto.
  @ApiPropertyOptional({ enum: RateKindDto, default: RateKindDto.fija })
  @IsOptional()
  @IsEnum(RateKindDto)
  rateKind?: RateKindDto;

  // FIN-032: cuota pactada — la fuente del compromiso para `saldo_y_cuota_pactada`
  // (gota a gota / informal), que no tiene plan de amortización de contrato.
  @ApiPropertyOptional({ example: 150000, description: 'Cuota mensual pactada (informal)' })
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  monthlyPayment?: number;

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

  // FIN-031: cupo total de una tarjeta de crédito (solo tarjetas).
  @ApiPropertyOptional({ example: 5000000, description: 'Cupo total (solo tarjeta de crédito)' })
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  creditLimit?: number;
}

export class UpdateDebtDto extends PartialType(CreateDebtDto) {}

/** FIN-031 · Compra a cuotas con tarjeta — pide solo el delta de la compra (H). */
export class CreateCardPurchaseDto {
  @ApiProperty({ example: 600000 })
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 3, description: 'Número de cuotas (1 = una sola)' })
  @NormalizeNumber()
  @IsInt()
  @IsPositive()
  installments!: number;

  @ApiPropertyOptional({ default: false, description: 'true = la compra a cuotas cobra interés' })
  @IsOptional()
  @IsBoolean()
  withInterest?: boolean;

  @ApiPropertyOptional({ example: '2026-07-12T13:00:00-05:00' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/** FIN-036 · Respuesta a una confirmación de actualización (nivel 2, §42). */
export class AnswerReviewDto {
  @ApiProperty({ example: true, description: 'true = el valor cambió; false = sigue igual' })
  @IsBoolean()
  changed!: boolean;

  @ApiPropertyOptional({ example: 3500000, description: 'El nuevo valor (solo si cambió)' })
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  newValue?: number;
}

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
