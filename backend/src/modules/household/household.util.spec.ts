import { fairShare, inviteCode, mentionsHouse } from './household.util';

describe('FIN-059 · aporte justo y cuadre', () => {
  it('caso del boceto: 60/40 por ingreso; Yonathan puso de más, Andrea le pasa $150.000', () => {
    const r = fairShare(
      [
        { userId: 'y', income: 6_000_000, shareIncome: true, paid: 2_070_000 },
        { userId: 'a', income: 4_000_000, shareIncome: true, paid: 1_130_000 },
      ],
      'proporcional',
    );
    expect(r.mode).toBe('proporcional');
    expect(r.total).toBe(3_200_000);
    expect(r.rows.map((x) => [x.userId, x.ratio, x.due])).toEqual([['y', 0.6, 1_920_000], ['a', 0.4, 1_280_000]]);
    expect(r.settlement).toEqual({ fromUserId: 'a', toUserId: 'y', amount: 150_000 });
  });

  it('si alguno no comparte su ingreso, es mitad y mitad y se dice por qué', () => {
    const r = fairShare(
      [
        { userId: 'y', income: 6_000_000, shareIncome: true, paid: 1_000_000 },
        { userId: 'a', income: 4_000_000, shareIncome: false, paid: 0 },
      ],
      'proporcional',
    );
    expect(r.mode).toBe('mitad');
    expect(r.fallbackReason).toBe('sin_ingreso_compartido');
    expect(r.settlement).toEqual({ fromUserId: 'a', toUserId: 'y', amount: 500_000 });
  });

  it('mitad pedida explícitamente: sin aviso; diferencias de menos de $1.000 no generan cuadre', () => {
    const r = fairShare(
      [
        { userId: 'y', income: null, shareIncome: false, paid: 500_400 },
        { userId: 'a', income: null, shareIncome: false, paid: 499_600 },
      ],
      'mitad',
    );
    expect(r.fallbackReason).toBeNull();
    expect(r.settlement).toBeNull();
  });

  it('un solo miembro (pareja aún no aceptó): sin cuadre', () => {
    const r = fairShare([{ userId: 'y', income: 1, shareIncome: true, paid: 300_000 }], 'proporcional');
    expect(r.settlement).toBeNull();
    expect(r.rows[0].due).toBe(300_000);
  });

  it('código de invitación: 6 caracteres sin letras ambiguas', () => {
    const c = inviteCode();
    expect(c).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });

  it('"casa" en el mensaje del bot marca el gasto del hogar', () => {
    expect(mentionsHouse('mercado 186.000 casa')).toBe(true);
    expect(mentionsHouse('pagué el arriendo de la casa 1.200.000')).toBe(true);
    expect(mentionsHouse('servicios del hogar 230.000')).toBe(true);
    expect(mentionsHouse('almuerzo 18.500')).toBe(false);
    expect(mentionsHouse('casadero 20.000')).toBe(false);
  });
});
