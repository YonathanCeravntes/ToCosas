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

export enum FixedKindDto {
  ingreso = 'ingreso',
  gasto = 'gasto',
}

export class CreateFixedItemDto {
  @ApiProperty({ enum: FixedKindDto, description: 'ingreso fijo (salario) o gasto fijo' })
  @IsEnum(FixedKindDto)
  kind!: FixedKindDto;

  @ApiProperty({ example: 'Arriendo' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 1200000 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 5, description: 'Día del mes (1-31) en que aplica' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2036-07-01' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFixedItemDto extends PartialType(CreateFixedItemDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** FIN-016 · Día de inicio del ciclo financiero (DEC-0011 §4.6: rango 1–28). */
export class SetCyclePeriodDto {
  @ApiProperty({ minimum: 1, maximum: 28, example: 15 })
  @IsInt()
  @Min(1)
  @Max(28)
  cycleStartDay!: number;
}
