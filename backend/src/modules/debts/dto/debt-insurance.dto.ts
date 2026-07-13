import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/** FIN-013 · Seguros asociados al crédito (DEC-0011 §4.1).
 *  FIN-023: + `cuota_manejo` (cargo bancario, dato del usuario — sin default;
 *  `endorsed`/`insurer` no aplican y el service los rechaza con 400). */
export enum DebtInsuranceKindDto {
  vida_deudor = 'vida_deudor',
  incendio_terremoto = 'incendio_terremoto',
  todo_riesgo = 'todo_riesgo',
  desempleo = 'desempleo',
  cuota_manejo = 'cuota_manejo',
  otro = 'otro',
}

export class CreateDebtInsuranceDto {
  @ApiPropertyOptional({ enum: DebtInsuranceKindDto, default: DebtInsuranceKindDto.otro })
  @IsOptional()
  @IsEnum(DebtInsuranceKindDto)
  kind?: DebtInsuranceKindDto;

  @ApiProperty({ example: 'Seguro de vida deudor' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 45000, description: 'Prima mensual en COP' })
  @IsNumber()
  @IsPositive()
  monthlyPremium!: number;

  @ApiPropertyOptional({ default: true, description: 'true = la prima va dentro de la cuota del crédito' })
  @IsOptional()
  @IsBoolean()
  financed?: boolean;

  @ApiPropertyOptional({ default: false, description: 'true = póliza propia endosada al banco' })
  @IsOptional()
  @IsBoolean()
  endorsed?: boolean;

  @ApiPropertyOptional({ example: 'Seguros Alfa' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  insurer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateDebtInsuranceDto extends PartialType(CreateDebtInsuranceDto) {
  @ApiPropertyOptional({ description: 'false = el seguro deja de sumar en el desglose' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
