import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
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

/** FIN-056: cómo se pagó (mismo enum que Mis documentos). */
export enum PaymentMethodDto {
  tarjeta = 'tarjeta',
  transferencia = 'transferencia',
  efectivo = 'efectivo',
  desconocido = 'desconocido',
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

  @ApiPropertyOptional({ enum: PaymentMethodDto, description: 'FIN-056: cómo se pagó (efectivo, tarjeta, transferencia).' })
  @IsOptional()
  @IsEnum(PaymentMethodDto)
  paymentMethod?: PaymentMethodDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'UUID generado en el cliente (idempotencia offline)' })
  @IsOptional()
  @IsUUID()
  clientUuid?: string;

  @ApiPropertyOptional({ description: 'FIN-049: el gasto ES este gasto fijo (se eligió "Cada mes" en Registrar)' })
  @IsOptional()
  @IsString()
  fixedItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

// El enlace con un gasto fijo solo se fija al crear (lo valida el servicio).
export class UpdateTransactionDto extends PartialType(OmitType(CreateTransactionDto, ['fixedItemId'] as const)) {}
