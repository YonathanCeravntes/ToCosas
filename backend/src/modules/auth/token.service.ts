import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string; // user id
  email?: string | null;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Emisión y verificación de JWT (access + refresh).
 * Los secretos vienen de variables de entorno (ver .env.example).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret');
  }

  private refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret');
  }

  private accessTtl(): number {
    return parseInt(this.config.get<string>('JWT_ACCESS_TTL', '3600'), 10);
  }

  async issueTokens(userId: string, email?: string | null): Promise<TokenPair> {
    const expiresIn = this.accessTtl();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, type: 'access' } as JwtPayload,
      { secret: this.accessSecret(), expiresIn },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, type: 'refresh' } as JwtPayload,
      { secret: this.refreshSecret(), expiresIn: '30d' },
    );
    return { accessToken, refreshToken, expiresIn };
  }

  async verifyAccess(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, { secret: this.accessSecret() });
  }

  async verifyRefresh(token: string): Promise<JwtPayload> {
    const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.refreshSecret(),
    });
    if (payload.type !== 'refresh') {
      throw new Error('Token no es de tipo refresh');
    }
    return payload;
  }
}
