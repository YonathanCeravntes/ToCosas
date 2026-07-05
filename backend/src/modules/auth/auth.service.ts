import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TRIAL_DAYS } from '../billing/subscription.service';
import { PasswordService } from './password.service';
import { TokenService, TokenPair } from './token.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthResult {
  user: { id: string; email: string | null; fullName: string | null };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName ?? null,
        currency: dto.currency ?? 'COP',
        // Trial de Millo+ al registrarse, una única vez (DEC-0009 §4.8).
        // Directo aquí (no vía SubscriptionService) para evitar el ciclo
        // AuthModule↔BillingModule; espeja grantTrialOnce + caché de plan.
        settings: { create: { plan: 'premium' } },
        subscriptions: {
          create: {
            status: 'trial',
            provider: 'manual',
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
          },
        },
      },
    });
    const tokens = await this.tokens.issueTokens(user.id, user.email);
    return { user: this.publicUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await this.passwords.verify(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const tokens = await this.tokens.issueTokens(user.id, user.email);
    return { user: this.publicUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.tokens.issueTokens(user.id, user.email);
  }

  private publicUser(user: {
    id: string;
    email: string | null;
    fullName: string | null;
  }): AuthResult['user'] {
    return { id: user.id, email: user.email, fullName: user.fullName };
  }
}
