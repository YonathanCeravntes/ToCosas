import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  DeleteAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { PasswordRecoveryService } from './password-recovery.service';
import { AccountService } from './account.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly recovery: PasswordRecoveryService,
    private readonly account: AccountService,
  ) {}

  // Hardening FIN-009 (DEC-0009 §4): anti fuerza bruta — 5 intentos/min por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return { tokens: await this.auth.refresh(dto.refreshToken) };
  }

  // --- FIN-039 · Recuperar contraseña (público, con throttle duro) ---

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('password/forgot')
  @HttpCode(202)
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.recovery.requestCode(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password/reset')
  reset(@Body() dto: ResetPasswordDto) {
    return this.recovery.resetWithCode(dto.email, dto.code, dto.newPassword);
  }

  // --- Sesión ---

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.account.me(user.id);
  }

  /** FIN-038 · Onboarding: la app marca el recorrido inicial como hecho. */
  @Post('onboarding/done')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  onboardingDone(@CurrentUser() user: AuthUser) {
    return this.account.markOnboardingDone(user.id);
  }

  /** FIN-039 · Consentimiento de datos para cuentas que se registraron antes. */
  @Post('data-policy/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  acceptDataPolicy(@CurrentUser() user: AuthUser) {
    return this.account.acceptDataPolicy(user.id);
  }

  /** FIN-039 · Portabilidad: todos los datos del usuario en JSON. */
  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  exportData(@CurrentUser() user: AuthUser) {
    return this.account.exportData(user.id);
  }

  /** FIN-039 · Supresión: borrado lógico + anonimización inmediata. */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.account.deleteAccount(user.id, dto.password);
  }
}
