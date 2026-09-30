import { createHmac } from 'crypto';
import { verifyMetaSignature } from './signature.util';

describe('verifyMetaSignature', () => {
  const secret = 'app-secret-123';
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const validSig =
    'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  it('acepta una firma válida', () => {
    expect(verifyMetaSignature(body, validSig, secret)).toBe(true);
  });

  it('rechaza una firma inválida', () => {
    expect(verifyMetaSignature(body, 'sha256=deadbeef', secret)).toBe(false);
  });

  it('rechaza si falta el header', () => {
    expect(verifyMetaSignature(body, undefined, secret)).toBe(false);
  });

  it('rechaza si el cuerpo fue alterado', () => {
    expect(verifyMetaSignature(body + 'x', validSig, secret)).toBe(false);
  });

  it('rechaza si el secreto es incorrecto', () => {
    expect(verifyMetaSignature(body, validSig, 'otro-secreto')).toBe(false);
  });
});
