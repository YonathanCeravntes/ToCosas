import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { debtsApi, CreateDebtInput } from '../../api/endpoints';
import { ProductFieldSpec, ProductTypeDescriptor } from '../../api/types';
import { useApi } from '../../utils/useApi';
import { parseDecimal, parseAmount } from '../../utils/format';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddDebt'>;

/**
 * FIN-032 · El alta se ARMA desde el catálogo del backend (la única autoridad de
 * tipo). Esta pantalla no conoce ningún tipo por nombre: elige un `debtType`,
 * pide solo los campos que su descriptor declara (guardarraíl B) y arma el payload
 * por la `key` de cada campo. Sin ramificación por tipo — cero literal de tipo aquí
 * (la única comparación de `debtType` es dinámica: qué chip está activo).
 */
export function AddDebtScreen({ navigation }: Props) {
  const { data: catalog } = useApi(() => debtsApi.catalog(), []);
  const [type, setType] = useState<ProductTypeDescriptor | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(
    () => (type ? [...type.requiredFields, ...type.optionalFields] : []),
    [type],
  );

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));
  const pick = (t: ProductTypeDescriptor) => {
    setType(t);
    setValues({});
    setError(null);
  };

  // BT-001: montos/plazos → entero (descarta miles); tasa → decimal regional.
  const amt = (s?: string) => {
    const n = parseAmount(s ?? '');
    return Number.isNaN(n) ? 0 : n;
  };

  const onSubmit = async () => {
    if (!type) return;
    setError(null);
    // Guardarraíl B: cada campo obligatorio de este tipo debe venir.
    const missing = type.requiredFields.find((f) => !values[f.key]);
    if (missing) {
      setError(`Falta ${missing.label.toLowerCase()}.`);
      return;
    }
    const balance = amt(values.currentBalance);
    const payload: CreateDebtInput = {
      name: values.name,
      debtType: type.debtType,
      // Tarjeta/fintech nacen en 0 (saldo derivado de compras); el resto usa el saldo/monto.
      originalAmount: balance,
      currentBalance: balance,
      startDate: new Date().toISOString().slice(0, 10),
      termMonths: values.termMonths ? amt(values.termMonths) : undefined,
      interestRate: values.interestRate ? parseDecimal(values.interestRate) : undefined,
      rateKind: (values.rateKind as 'fija' | 'variable') || undefined,
      monthlyPayment: values.monthlyPayment ? amt(values.monthlyPayment) : undefined,
      paymentDay: values.paymentDay ? amt(values.paymentDay) : undefined,
      creditLimit: values.creditLimit ? amt(values.creditLimit) : undefined,
      rateBasis: 'EA',
    };
    setLoading(true);
    try {
      await debtsApi.create(payload);
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      {/* Guardarraíl A: se elige el TIPO primero (no un nombre). */}
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: spacing.sm }}>
        ¿Qué tipo de deuda es?
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {(catalog ?? []).map((t) => {
          const active = type?.debtType === t.debtType;
          return (
            <Pressable
              key={t.debtType}
              onPress={() => pick(t)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.textInverse : colors.text, fontSize: 13 }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {type ? (
        <>
          {fields.map((f) => (
            <FieldFromSpec key={f.key} spec={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
          ))}
          {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          <Button title={`Guardar ${type.label.toLowerCase()}`} onPress={onSubmit} loading={loading} />
        </>
      ) : (
        <Text style={{ color: colors.textMuted }}>Elige el tipo para ver qué datos necesito.</Text>
      )}
    </ScrollView>
  );
}

/** Renderiza un campo del alta según su `kind` declarado en el descriptor. */
function FieldFromSpec({
  spec,
  value,
  onChange,
}: {
  spec: ProductFieldSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  if (spec.kind === 'select') {
    return (
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={{ color: colors.textMuted, marginBottom: 6, fontSize: 13 }}>{spec.label}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(spec.options ?? []).map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChange(opt.value)}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: active ? colors.textInverse : colors.text, fontSize: 13 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <Field
      label={spec.label}
      value={value}
      onChangeText={onChange}
      keyboardType={spec.kind === 'text' ? 'default' : 'numeric'}
      placeholder={spec.placeholder}
    />
  );
}
