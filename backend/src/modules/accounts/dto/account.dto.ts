import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum AccountTypeDto {
  efectivo = 'efectivo',
  ahorros = 'ahorros',
  corriente = 'corriente',
  billetera = 'billetera',
  otro = 'otro',
}

export class CreateAccountDto {
  @ApiProperty({ example: 'Cuenta de ahorros Bancolombia' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: AccountTypeDto })
  @IsEnum(AccountTypeDto)
  type!: AccountTypeDto;

  @ApiPropertyOptional({ example: 1500000, description: 'Saldo inicial' })
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isLiquid?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeInNetWorth?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Marca la cuenta como fondo de emergencia' })
  @IsOptional()
  @IsBoolean()
  isEmergencyFund?: boolean;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}

export class UpdateBalanceDto {
  @ApiProperty({ example: 1750000, description: 'Nuevo saldo de la cuenta' })
  @IsNumber()
  balance!: number;
}
