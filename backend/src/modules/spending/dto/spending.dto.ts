import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { NormalizeNumber } from '../../../common/parse-number.util';

export class UpdateSpendClassDto {
  @ApiPropertyOptional({ enum: ['esencial', 'gusto'], nullable: true, description: 'null = volver a la sugerencia de Millo' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['esencial', 'gusto'])
  spendClass?: 'esencial' | 'gusto' | null;

  @ApiPropertyOptional({ description: '"Esto me sostiene": Millo nunca sugiere espaciarlo' })
  @IsOptional()
  @IsBoolean()
  protected?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Tope mensual (0 o null = sin tope)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  monthlyCap?: number | null;
}
