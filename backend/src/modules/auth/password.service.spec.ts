import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashea y verifica correctamente', async () => {
    const hash = await service.hash('secreto123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await service.verify('secreto123', hash)).toBe(true);
  });

  it('rechaza contraseña incorrecta', async () => {
    const hash = await service.hash('secreto123');
    expect(await service.verify('otra-clave', hash)).toBe(false);
  });

  it('genera salts distintos (hashes distintos para misma clave)', async () => {
    const a = await service.hash('secreto123');
    const b = await service.hash('secreto123');
    expect(a).not.toBe(b);
  });

  it('lanza error con contraseña muy corta', async () => {
    await expect(service.hash('123')).rejects.toThrow();
  });

  it('verify devuelve false ante formato inválido', async () => {
    expect(await service.verify('x', 'no-es-un-hash')).toBe(false);
    expect(await service.verify('x', '')).toBe(false);
  });
});
