import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const config = new ConfigService({
    JWT_ACCESS_SECRET: 'test-access',
    JWT_REFRESH_SECRET: 'test-refresh',
    JWT_ACCESS_TTL: '3600',
  });
  const service = new TokenService(new JwtService(), config);

  it('emite un par de tokens con expiración', async () => {
    const pair = await service.issueTokens('user-1', 'a@b.com');
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(pair.expiresIn).toBe(3600);
  });

  it('verifica el access token y recupera el sub', async () => {
    const pair = await service.issueTokens('user-1', 'a@b.com');
    const payload = await service.verifyAccess(pair.accessToken);
    expect(payload.sub).toBe('user-1');
    expect(payload.type).toBe('access');
  });

  it('verifica el refresh token', async () => {
    const pair = await service.issueTokens('user-2');
    const payload = await service.verifyRefresh(pair.refreshToken);
    expect(payload.sub).toBe('user-2');
    expect(payload.type).toBe('refresh');
  });

  it('rechaza un access token con secreto equivocado', async () => {
    const pair = await service.issueTokens('user-3');
    // el refresh está firmado con otro secreto → no valida como access
    await expect(service.verifyAccess(pair.refreshToken)).rejects.toBeDefined();
  });

  it('no acepta un access token como refresh', async () => {
    const pair = await service.issueTokens('user-4');
    await expect(service.verifyRefresh(pair.accessToken)).rejects.toBeDefined();
  });
});
