import { generateOtp, hashOtp, looksLikeOtp } from './otp.util';

describe('otp.util', () => {
  it('genera OTP de 6 dígitos', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it('el hash depende del teléfono (mismo código, distinto número → distinto hash)', () => {
    expect(hashOtp('123456', '+573001112222')).not.toBe(
      hashOtp('123456', '+573009998888'),
    );
  });

  it('el hash es estable para el mismo par', () => {
    expect(hashOtp('123456', '+573001112222')).toBe(
      hashOtp('123456', '+573001112222'),
    );
  });

  it('reconoce un texto que parece OTP', () => {
    expect(looksLikeOtp('123456')).toBe(true);
    expect(looksLikeOtp('  834192 ')).toBe(true);
    expect(looksLikeOtp('12345')).toBe(false);
    expect(looksLikeOtp('hola')).toBe(false);
  });
});
