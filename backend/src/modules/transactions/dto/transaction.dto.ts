import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export enum TxKindDto {
  ingreso = 'ingreso',
  gasto = 'gasto',
  pago_deuda = 'pago_deuda',
  transferencia = 'transferencia',
}

export class CreateTransactionDto {
  @ApiProperty({ enum: TxKindDto })
  @IsEnum(TxKindDto)
  kind!: TxKindDto;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-07-03T13:00:00-05:00' })
  @IsISO8601()
  occurredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Requerido si kind = pago_deuda' })
  @IsOptional()
  @IsString()
  debtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'UUID generado en el cliente (idempotencia offline)' })
  @IsOptional()
  @IsUUID()
  clientUuid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
