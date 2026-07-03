import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateTransactionDto } from '../../transactions/dto/transaction.dto';

/** Una transacción entrante desde el cliente offline (incluye marca temporal). */
export class PushTransaction extends CreateTransactionDto {
  @ApiPropertyOptional({ description: 'updatedAt del cliente (ISO) para LWW' })
  @IsOptional()
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'id del servidor si ya existía' })
  @IsOptional()
  id?: string;
}

export class PushDto {
  @ApiPropertyOptional({ type: [PushTransaction] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushTransaction)
  created?: PushTransaction[];

  @ApiPropertyOptional({ type: [PushTransaction] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushTransaction)
  updated?: PushTransaction[];

  @ApiPropertyOptional({ type: [String], description: 'ids a borrar' })
  @IsOptional()
  @IsArray()
  deleted?: string[];
}
