import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';
import { NormalizeNumber } from '../../common/parse-number.util';

export class CreateAnnualExpenseDto {
  @ApiProperty({ example: 'SOAT' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 620000 })
  @NormalizeNumber()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 3, description: 'Mes del año en que se paga (1–12)' })
  @NormalizeNumber()
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class UpdateAnnualExpenseDto extends PartialType(CreateAnnualExpenseDto) {}

export class WindfallSplitDto {
  @ApiProperty({ example: 60 }) @IsInt() @Min(0) @Max(100) debtPct!: number;
  @ApiProperty({ example: 20 }) @IsInt() @Min(0) @Max(100) cushionPct!: number;
  @ApiProperty({ example: 20 }) @IsInt() @Min(0) @Max(100) freePct!: number;
}

