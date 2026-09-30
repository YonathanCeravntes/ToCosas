import {
  descriptorFor,
  productCatalog,
  scheduleModelFor,
  PRODUCT_TYPE_DESCRIPTORS,
} from './product-type.descriptor';

/**
 * FIN-032 (DEC-0032) · El descriptor es la ÚNICA autoridad de tipo. Estos tests
 * fijan que los 4 arquetipos divergentes caen en los 3 `scheduleModel` existentes
 * SIN una rama por tipo, y que un tipo desconocido cae al comodín (guardarraíl F).
 */
describe('PRODUCT_TYPE_DESCRIPTORS (FIN-032, GOBERNANZA §32/F)', () => {
  it('los 4 arquetipos divergentes → 3 scheduleModel existentes (la tesis)', () => {
    // Amortizado (contrato, FIN-012): hipoteca y libranza.
    expect(scheduleModelFor('hipotecario')).toBe('amortizado');
    expect(scheduleModelFor('libranza')).toBe('amortizado');
    // Cuotas por compra (FIN-031): compra a cuotas es un plan fijo → amortizado;
    // la tarjeta (revolvente) es cuotas_por_compra.
    expect(scheduleModelFor('compra_a_cuotas')).toBe('amortizado');
    expect(scheduleModelFor('tarjeta_credito')).toBe('cuotas_por_compra');
    // Saldo y cuota pactada (informal, sin fecha de libertad falsa): gota a gota.
    expect(scheduleModelFor('gota_a_gota')).toBe('saldo_y_cuota_pactada');
    expect(scheduleModelFor('prestamo_familiar')).toBe('saldo_y_cuota_pactada');
  });

  it('lo divergente por arquetipo es un FLAG DE DATOS, no un número aparte', () => {
    expect(descriptorFor('libranza').paymentSource).toBe('nomina');
    expect(descriptorFor('hipotecario').rate).toBe('fija_o_variable');
    expect(descriptorFor('hipotecario').capabilities.endorsableInsurance).toBe(true);
    expect(descriptorFor('gota_a_gota').rate).toBe('opcional');
    expect(descriptorFor('gota_a_gota').paymentSource).toBe('informal');
    expect(descriptorFor('tarjeta_credito').capabilities.installmentPurchases).toBe(true);
    expect(descriptorFor('fintech').capabilities.installmentPurchases).toBe(true);
  });

  it('un tipo desconocido cae al comodín `otro` (guardarraíl F, sin migrar)', () => {
    expect(descriptorFor('cripto_2099').debtType).toBe('otro');
    expect(scheduleModelFor('cripto_2099')).toBe('amortizado');
  });

  it('el catálogo tiene los 11 de 1ª clase + el comodín (12), cada uno con su alta mínima', () => {
    const catalog = productCatalog();
    expect(catalog).toHaveLength(12);
    // Guardarraíl B: cada tipo declara al menos un campo obligatorio (su mínimo).
    for (const d of catalog) {
      expect(d.requiredFields.length).toBeGreaterThan(0);
      // El nombre siempre es obligatorio.
      expect(d.requiredFields.some((f) => f.key === 'name')).toBe(true);
    }
    // El alta de una tarjeta pide cupo; la de un informal pide cuota pactada.
    expect(PRODUCT_TYPE_DESCRIPTORS.tarjeta_credito.requiredFields.some((f) => f.key === 'creditLimit')).toBe(true);
    expect(PRODUCT_TYPE_DESCRIPTORS.gota_a_gota.requiredFields.some((f) => f.key === 'monthlyPayment')).toBe(true);
    // Un amortizado pide plazo; un informal NO (no inventa cronograma).
    expect(PRODUCT_TYPE_DESCRIPTORS.hipotecario.requiredFields.some((f) => f.key === 'termMonths')).toBe(true);
    expect(PRODUCT_TYPE_DESCRIPTORS.gota_a_gota.requiredFields.some((f) => f.key === 'termMonths')).toBe(false);
  });
});
