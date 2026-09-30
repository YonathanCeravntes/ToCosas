import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum EntityTypeDto {
  banco = 'banco',
  cooperativa = 'cooperativa',
  fintech = 'fintech',
  prestamista_particular = 'prestamista_particular',
  tarjeta = 'tarjeta',
  otro = 'otro',
}

export class CreateEntityDto {
  @ApiProperty({ example: 'Prestamista Don José' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: EntityTypeDto, default: EntityTypeDto.otro })
  @IsEnum(EntityTypeDto)
  type!: EntityTypeDto;

  @ApiPropertyOptional({ example: '+573001112233' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Tasa típica en %' })
  @IsOptional()
  @IsNumber()
  typicalRate?: number;

  @ApiPropertyOptional({ example: 'MV' })
  @IsOptional()
  @IsString()
  rateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEntityDto extends PartialType(CreateEntityDto) {}
