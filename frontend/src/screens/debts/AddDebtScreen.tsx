import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { debtsApi, entitiesApi, CreateDebtInput } from '../../api/endpoints';
import { FinancialEntity, ProductFieldSpec, ProductTypeDescriptor } from '../../api/types';
import { useApi } from '../../utils/useApi';
import { parseDecimal, parseAmount } from '../../utils/format';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddDebt'>;

const CATEGORY: Record<string, { label: string; color: string }> = {
  banco: { label: 'Banco', color: '#2563eb' },
  cooperativa: { label: 'Cooperativa', color: '#0891b2' },
  fintech: { label: 'Fintech', color: '#7c3aed' },
  prestamista_particular: { label: 'Préstamo informal', color: '#b45309' },
  tarjeta: { label: 'Tarjeta', color: '#db2777' },
  otro: { label: 'Financiera', color: '#4b5563' },
};

/**
 * FIN-034 · Selector moderno de obligaciones. Reemplaza el muro de 12 chips por
 * búsqueda en 1ª persona: reconoces tu banco/tarjeta (catálogo de entidades) o
 * eliges el tipo directo. El alta sigue armándose desde el descriptor de FIN-032
 * (`/debts/catalog`) — cero literal de tipo. Reconocimiento, NO recomendación: el
 * orden no rankea "la mejor"; `typicalRate` prellena pero la tasa que confirmas
 * GANA; el tipo inferido SIEMPRE es editable (condiciones DEC-0034 §3).
 */
export function AddDebtScreen({ navigation }: Props) {
  const { data: catalog } = useApi(() => debtsApi.catalog(), []);
  const [query, setQuery] = useState('');
  const [entities, setEntities] = useState<FinancialEntity[]>([]);
  const [entity, setEntity] = useState<FinancialEntity | null>(null);
  const [type, setType] = useState<ProductTypeDescriptor | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda/browse: se recarga al cambiar el texto (sin q = estado de exploración).
  useEffect(() => {
    let alive = true;
    entitiesApi
      .search(query || undefined)
      .then((r) => alive && setEntities(r))
      .catch(() => alive && setEntities([]));
    return () => {
      alive = false;
    };
  }, [query]);

  const descriptorFor = (debtType: string | null | undefined) =>
    (catalog ?? []).find((t) => t.debtType === debtType) ?? null;

  const fields = useMemo(
    () => (type ? [...type.requiredFields, ...type.optionalFields] : []),
    [type],
  );

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  /** Prellena nombre y —como PISTA editable— la tasa típica de la entidad. */
  const prefill = (desc: ProductTypeDescriptor, ent: FinancialEntity | null) => {
    const next: Record<string, string> = {};
    if (ent) next.name = ent.name;
    const hasRate = [...desc.requiredFields, ...desc.optionalFields].some((f) => f.key === 'interestRate');
    if (ent?.typicalRate != null && hasRate) next.interestRate = String(ent.typicalRate);
    setValues(next);
  };

  const pickType = (desc: ProductTypeDescriptor, ent: FinancialEntity | null = entity) => {
    setType(desc);
    prefill(desc, ent);
    setError(null);
  };

  const pickEntity = (ent: FinancialEntity) => {
    setEntity(ent);
    setError(null);
    const inferred = descriptorFor(ent.suggestedDebtType);
    // Con tipo sugerido → abre el alta (editable); sin él (banco/coop) → pide el
    // producto sin bloquear (el usuario elige de las anclas de tipo).
    if (inferred) pickType(inferred, ent);
    else setValues({ name: ent.name });
  };

  const reset = () => {
    setType(null);
    setError(null);
  };

  const amt = (s?: string) => {
    const n = parseAmount(s ?? '');
    return Number.isNaN(n) ? 0 : n;
  };

  const onSubmit = async () => {
    if (!type) return;
    setError(null);
    const missing = type.requiredFields.find((f) => !values[f.key]);
    if (missing) {
      setError(`Falta ${missing.label.toLowerCase()}.`);
      return;
    }
    const balance = amt(values.currentBalance);
    const payload: CreateDebtInput = {
      name: values.name,
      debtType: type.debtType,
      originalAmount: balance,
      currentBalance: balance,
      startDate: new Date().toISOString().slice(0, 10),
      termMonths: values.termMonths ? amt(values.termMonths) : undefined,
      // La tasa que el usuario confirma GANA sobre la pista de la entidad (DEC-0034 §3.2).
      interestRate: values.interestRate ? parseDecimal(values.interestRate) : undefined,
      rateKind: (values.rateKind as 'fija' | 'variable') || undefined,
      monthlyPayment: values.monthlyPayment ? amt(values.monthlyPayment) : undefined,
      paymentDay: values.paymentDay ? amt(values.paymentDay) : undefined,
      creditLimit: values.creditLimit ? amt(values.creditLimit) : undefined,
      entityId: entity?.id,
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

  // --- FASE FORMULARIO: tipo elegido → alta mínima del descriptor ---
  if (type) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            {entity ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{entity.name}</Text> : null}
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{type.label}</Text>
          </View>
          {/* Condición §3.3: el tipo inferido SIEMPRE es editable. */}
          <Pressable onPress={reset}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Cambiar</Text>
          </Pressable>
        </View>

        {fields.map((f) => (
          <FieldFromSpec key={f.key} spec={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
        ))}
        {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title={`Guardar ${type.label.toLowerCase()}`} onPress={onSubmit} loading={loading} />
      </ScrollView>
    );
  }

  // --- FASE SELECTOR: buscar entidad o elegir tipo ---
  const q = query.trim().toLowerCase();
  const typeMatches = (catalog ?? []).filter((t) => !q || t.label.toLowerCase().includes(q));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text, marginBottom: 4 }}>¿Qué deuda tienes?</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>Busca tu banco o tarjeta, o elige el tipo.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Busca: Nu, Bancolombia, tarjeta…"
        placeholderTextColor={colors.textMuted}
        style={{
          borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text,
          backgroundColor: colors.surface, marginBottom: spacing.md,
        }}
      />

      {entity && !descriptorFor(entity.suggestedDebtType) ? (
        <Text style={{ color: colors.text, marginBottom: spacing.sm }}>
          Elige el producto de <Text style={{ fontWeight: '700' }}>{entity.name}</Text>:
        </Text>
      ) : null}

      {/* Entidades reconocidas (catálogo global + propias/recientes primero). */}
      {entities.length > 0 ? (
        <View style={{ marginBottom: spacing.md }}>
          {entities.slice(0, 8).map((e) => (
            <Pressable
              key={e.id}
              onPress={() => pickEntity(e)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm }}
            >
              <Monogram name={e.name} type={e.type} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{e.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {CATEGORY[e.type]?.label ?? 'Financiera'}
                  {e.isGlobal ? '' : ' · tuya'}
                </Text>
              </View>
              <Text style={{ color: colors.textMuted }}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Degradación con gracia: el camino libre SIEMPRE existe (elige un tipo). */}
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
        {q ? 'O elige el tipo' : 'Tipos de deuda'}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {typeMatches.map((t) => (
          <Pressable
            key={t.debtType}
            onPress={() => pickType(t)}
            style={{
              paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {q && entities.length === 0 ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.md, fontSize: 13 }}>
          No está "{query}" en el catálogo — elige el tipo y ponle ese nombre. Nadie queda por fuera.
        </Text>
      ) : null}
    </ScrollView>
  );
}

/** Monograma de respaldo (sin logos remotos en P1): inicial + color por categoría. */
function Monogram({ name, type }: { name: string; type: string }) {
  const bg = CATEGORY[type]?.color ?? colors.textMuted;
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800' }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
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
                  flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center',
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1, borderColor: active ? colors.primary : colors.border,
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
