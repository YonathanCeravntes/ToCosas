import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class StartLinkDto {
  @ApiProperty({ example: '+573001112222', description: 'Teléfono en formato E.164' })
  @Matches(/^\+\d{8,15}$/, { message: 'Teléfono inválido (E.164, ej: +573001112222)' })
  phoneE164!: string;
}
