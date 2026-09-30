import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'juan@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secreto123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'COP', default: 'COP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  /**
   * FIN-039 · Consentimiento de tratamiento de datos (Ley 1581). La app lo exige en
   * el formulario; el backend lo registra en `UserSettings.dataConsentAt` cuando
   * llega en true. Opcional en el DTO para no romper clientes/pruebas anteriores.
   */
  @ApiPropertyOptional({ example: true, description: 'Acepta la política de datos' })
  @IsOptional()
  @IsBoolean()
  acceptsDataPolicy?: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'juan@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secreto123' })
  @IsString()
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'juan@mail.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'juan@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '482913', description: 'Código de 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 dígitos' })
  code!: string;

  @ApiProperty({ example: 'nuevoSecreto123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class DeleteAccountDto {
  @ApiProperty({ example: 'secreto123', description: 'Contraseña actual, para confirmar' })
  @IsString()
  password!: string;
}
