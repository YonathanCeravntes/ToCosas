import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  pushToken!: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: '0.1.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
