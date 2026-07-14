import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum WorkProfileDto {
  empleado = 'empleado',
  independiente = 'independiente',
  empresario = 'empresario',
  pensionado = 'pensionado',
  estudiante = 'estudiante',
  otro = 'otro',
}

export class SetIncomeProfileDto {
  @ApiProperty({ enum: WorkProfileDto })
  @IsEnum(WorkProfileDto)
  workProfile!: WorkProfileDto;
}

export enum IncomeSourceKindDto {
  salario_fijo = 'salario_fijo',
  salario_variable = 'salario_variable',
  comisiones = 'comisiones',
  bonificaciones = 'bonificaciones',
  honorarios = 'honorarios',
  otro = 'otro',
}

export class CreateIncomeSourceDto {
  @ApiPropertyOptional({ enum: IncomeSourceKindDto, default: IncomeSourceKindDto.otro })
  @IsOptional()
  @IsEnum(IncomeSourceKindDto)
  kind?: IncomeSourceKindDto;

  @ApiProperty({ example: 'Salario mensual' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 4200000, description: 'Monto mensual (fijo) o estimado (variable)' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ default: false, description: 'true = el monto varía mes a mes (estimado)' })
  @IsOptional()
  @IsBoolean()
  isVariable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dayOfMonth?: number;
}

export class UpdateIncomeSourceDto extends PartialType(CreateIncomeSourceDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export enum DeductionKindDto {
  salud = 'salud',
  pension = 'pension',
  otra = 'otra',
}

export enum DeductionBaseDto {
  total = 'total',
  parcial = 'parcial',
}

/**
 * FIN-027: requisito duro del Fundador — base configurable total/parcial.
 * `percent` XOR `fixedAmount` (una deducción es porcentual o un monto plano,
 * nunca ambas). `baseAmount` obligatorio solo cuando `base = parcial`.
 */
export class CreateDeductionDto {
  @ApiPropertyOptional({ enum: DeductionKindDto, default: DeductionKindDto.otra })
  @IsOptional()
  @IsEnum(DeductionKindDto)
  kind?: DeductionKindDto;

  @ApiProperty({ example: 'Salud (EPS)' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 4, description: '% de la base (usa esto O fixedAmount, no ambos)' })
  @IsOptional()
  @IsNumber()
  percent?: number;

  @ApiPropertyOptional({ example: 80000, description: 'Monto fijo mensual (usa esto O percent)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  fixedAmount?: number;

  @ApiPropertyOptional({ enum: DeductionBaseDto, default: DeductionBaseDto.total })
  @IsOptional()
  @IsEnum(DeductionBaseDto)
  base?: DeductionBaseDto;

  @ApiPropertyOptional({ description: 'Monto de la base parcial — requerido si base=parcial' })
  @ValidateIf((o) => o.base === DeductionBaseDto.parcial)
  @IsNumber()
  @IsPositive()
  baseAmount?: number;

  @ApiPropertyOptional({ default: true, description: 'true = retenida por el pagador; false = la pagas tú (compromiso del ciclo)' })
  @IsOptional()
  @IsBoolean()
  withheldAtSource?: boolean;
}

export class UpdateDeductionDto extends PartialType(CreateDeductionDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
