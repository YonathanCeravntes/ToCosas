import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export enum AssetTypeDto {
  inmueble = 'inmueble',
  vehiculo = 'vehiculo',
  inversion = 'inversion',
  negocio = 'negocio',
  otro = 'otro',
}

export class CreateAssetDto {
  @ApiProperty({ example: 'Apartamento' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: AssetTypeDto })
  @IsEnum(AssetTypeDto)
  type!: AssetTypeDto;

  @ApiProperty({ example: 250000000, description: 'Valor actual' })
  @IsNumber()
  @IsPositive()
  currentValue!: number;

  @ApiPropertyOptional({ example: 200000000 })
  @IsOptional()
  @IsNumber()
  acquisitionValue?: number;

  @ApiPropertyOptional({ example: '2020-01-15' })
  @IsOptional()
  @IsISO8601()
  acquisitionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLiquid?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeInNetWorth?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
