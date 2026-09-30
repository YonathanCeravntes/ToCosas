import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReminderDto {
  @ApiProperty({ example: 'Cuota crédito casa' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsISO8601()
  dueDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debtId?: string;

  @ApiPropertyOptional({ example: 739000 })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: [3, 1, 0], description: 'Días antes para avisar' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  offsetsDays?: number[];

  @ApiPropertyOptional({ example: ['push', 'whatsapp'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
}

export class UpdateReminderDto extends PartialType(CreateReminderDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
