import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DatePicker } from '../../components/DatePicker';
import { formatLocalDate } from '../../utils/format';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field, Ico, IconName } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { debtsApi, entitiesApi, CreateDebtInput } from '../../api/endpoints';
import { FinancialEntity, ProductFieldSpec, ProductTypeDescriptor } from '../../api/types';
import { useApi } from '../../utils/useApi';
import { parseDecimal, parseAmount } from '../../utils/format';
import { localDateKey } from '../../utils/dates';
import { RateInput } from '../../components/RateInput';
import { RateUnit, toEA } from '../../utils/rates';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddDebt'>;

const CATEGORY: Record<string, string> = {
  banco: 'Banco',
  cooperativa: 'Cooperativa',
  fintech: 'Fintech',
  prestamista_particular: 'Préstamo informal',
  tarjeta: 'Tarjeta',
  otro: 'Financiera',
};

/**
 * Nueva deuda · opción D (Fundador, 2026-09-29): primero el TIPO en cuadrícula,
 * agrupado; después la entidad. Mismo lenguaje visual de Mis deudas.
 */
const TYPE_GROUPS: Array<{ title: string; types: string[] }> = [
  { title: 'TARJETAS Y CUPOS', types: ['tarjeta_credito', 'fintech'] },
  { title: 'CRÉDITOS', types: ['libre_inversion', 'libranza', 'hipotecario', 'vehiculo'] },
];
const TYPE_ICON: Record<string, IconName> = {
  tarjeta_credito: 'card-outline',
  fintech: 'phone-portrait-outline',
  compra_a_cuotas: 'bag-handle-outline',
  credito_personal: 'person-outline',
  libre_inversion: 'cash-outline',
  libranza: 'briefcase-outline',
  hipotecario: 'home-outline',
  vehiculo: 'car-outline',
  educativo: 'school-outline',
  gota_a_gota: 'water-outline',
  prestamo_familiar: 'people-outline',
  otro: 'ellipsis-horizontal-circle-outline',
};

/** "Tarjeta/cupo fintech (Nu, RappiCard…)" → título + ejemplos en pequeño. */
function splitLabel(label: string): { main: string; sub: string | null } {
  const m = label.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { main: m[1], sub: m[2] } : { main: label, sub: null };
}

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
  // BP-26: fecha real de inicio (pedido del Fundador, 2026-07): una deuda que empezó
  // hace 2 años no puede nacer con cronograma desde hoy. Por defecto, hoy.
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  // Opción D: tras elegir el tipo, paso 2 = "¿Con qué entidad?" (se puede omitir).
  const [choosingEntity, setChoosingEntity] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  // FIN-056: unidad de la tasa; la pista de la entidad (typicalRate) viene en EA.
  const [rateUnit, setRateUnit] = useState<RateUnit>('mensual');

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

  const fields = useMemo(() => {
    if (!type) return [];
    const all = [...type.requiredFields, ...type.optionalFields];
    // Mis deudas (opción B): la barra "pagado a capital" necesita cuánto te prestaron.
    // Las tarjetas no lo usan (su barra es el uso del cupo).
    if (type.scheduleModel === 'cuotas_por_compra') return all;
    const at = all.findIndex((f) => f.key === 'currentBalance');
    all.splice(at + 1, 0, ORIGINAL_AMOUNT_FIELD);
    return all;
  }, [type]);

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  /** Prellena nombre y —como PISTA editable— la tasa típica de la entidad. */
  const prefill = (desc: ProductTypeDescriptor, ent: FinancialEntity | null) => {
    const next: Record<string, string> = {};
    if (ent) next.name = ent.name;
    const hasRate = [...desc.requiredFields, ...desc.optionalFields].some((f) => f.key === 'interestRate');
    if (ent?.typicalRate != null && hasRate) {
      next.interestRate = String(ent.typicalRate);
      setRateUnit('anual');
    }
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
    else {
      setValues({ name: ent.name });
      setQuery('');
    }
  };

  const reset = () => {
    setType(null);
    setEntity(null);
    setChoosingEntity(false);
    setQuery('');
    setError(null);
  };

  /** Paso 1 de la opción D: el tipo desde la cuadrícula → paso 2 (entidad),
   *  salvo deudas informales (no hay banco que elegir). */
  const pickTypeFromGrid = (desc: ProductTypeDescriptor) => {
    setQuery('');
    // Entidad ya elegida por búsqueda (banco sin producto sugerido): directo al alta.
    if (entity) {
      pickType(desc, entity);
      return;
    }
    pickType(desc, null);
    setChoosingEntity(desc.scheduleModel !== 'saldo_y_cuota_pactada');
  };

  const pickEntityForType = (ent: FinancialEntity | null) => {
    if (!type) return;
    setEntity(ent);
    prefill(type, ent);
    setChoosingEntity(false);
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
      // Sin el monto inicial, se toma el saldo de hoy (la barra arranca en 0%).
      originalAmount: amt(values.originalAmount) > 0 ? amt(values.originalAmount) : balance,
      currentBalance: balance,
      // BT-027: día LOCAL (antes toISOString daba el día siguiente después de las 7 p. m.).
      startDate: localDateKey(startDate),
      termMonths: values.termMonths ? amt(values.termMonths) : undefined,
      // La tasa que el usuario confirma GANA sobre la pista de la entidad (DEC-0034 §3.2).
      // FIN-056 (boceto 5): la tasa se escribe como la conoce la persona y viaja en EA.
      interestRate: values.interestRate ? toEA(parseDecimal(values.interestRate), rateUnit) : undefined,
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
  if (type && !choosingEntity) {
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

        {fields.map((f) =>
          f.kind === 'rate' ? (
            <RateInput
              key={f.key}
              label={f.label.replace(/\s*\(% EA(, opcional)?\)/, (m) => (m.includes('opcional') ? ' (opcional)' : ''))}
              value={values[f.key] ?? ''}
              unit={rateUnit}
              onChange={(v, u) => { set(f.key, v); setRateUnit(u); }}
            />
          ) : (
            <FieldFromSpec key={f.key} spec={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
          ),
        )}
        <Text style={{ color: colors.textMuted, marginBottom: 6, fontSize: 13 }}>¿Cuándo empezó? (opcional)</Text>
        <Pressable
          onPress={() => setShowStartPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Fecha de inicio ${formatLocalDate(startDate)}, cambiar`}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 44, marginBottom: spacing.md }}
        >
          <Text style={{ fontSize: 16, color: colors.text }}><Ico name="calendar-outline" /> {formatLocalDate(startDate)}</Text>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Cambiar</Text>
        </Pressable>
        {showStartPicker ? (
          <DatePicker value={startDate} mode="date" maximumDate={new Date()} onChange={(e, s) => { if (Platform.OS !== 'ios') setShowStartPicker(false); if (e.type === 'set' && s) setStartDate(s); }} />
        ) : null}
        {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title={`Guardar ${type.label.toLowerCase()}`} onPress={onSubmit} loading={loading} />
      </ScrollView>
    );
  }

  const q = query.trim().toLowerCase();

  // --- PASO 2 (opción D): tipo elegido → ¿con qué entidad? (omitible) ---
  if (type && choosingEntity) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <TypeBadge debtType={type.debtType} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{splitLabel(type.label).main}</Text>
            <Text style={{ fontWeight: '800', fontSize: 20, color: colors.text }}>¿Con qué entidad?</Text>
          </View>
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Cambiar</Text>
          </Pressable>
        </View>
        <SearchBox value={query} onChange={setQuery} placeholder="Busca tu banco o entidad" />
        <Pressable
          onPress={() => pickEntityForType(null)}
          accessibilityRole="button"
          style={{ minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.md }}
        >
          <Ico name="add" color={colors.primary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{q ? `No está "${query}"` : 'Otra entidad o sin banco'}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sigue y escribe tú el nombre</Text>
          </View>
        </Pressable>
        {entities.length > 0 ? (
          <View style={listCard}>
            {entities.slice(0, 12).map((e, i) => (
              <EntityRow key={e.id} entity={e} last={i === Math.min(entities.length, 12) - 1} onPress={() => pickEntityForType(e)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  // --- PASO 1 (opción D): ¿qué tipo de deuda es? (cuadrícula agrupada) ---
  const all = catalog ?? [];
  const byType = new Map(all.map((t) => [t.debtType as string, t]));
  const grouped = new Set(TYPE_GROUPS.flatMap((g) => g.types));
  const groups = TYPE_GROUPS.map((g) => ({
    title: g.title,
    items: g.types.map((t) => byType.get(t)).filter((t): t is ProductTypeDescriptor => !!t),
  }));
  const others = all.filter((t) => !grouped.has(t.debtType));
  const typeMatches = all.filter((t) => t.label.toLowerCase().includes(q));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontWeight: '800', fontSize: 22, color: colors.text, marginBottom: 4 }}>¿Qué tipo de deuda es?</Text>
      {entity ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Monogram name={entity.name} />
          <Text style={{ color: colors.text, flex: 1 }}>
            Elige el producto de <Text style={{ fontWeight: '700' }}>{entity.name}</Text>
          </Text>
          <Pressable onPress={() => setEntity(null)} accessibilityRole="button" accessibilityLabel="Cambiar entidad" hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Cambiar</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>Después eliges el banco.</Text>
      )}
      <SearchBox value={query} onChange={setQuery} placeholder="Busca banco o tipo" />

      {q ? (
        <>
          {typeMatches.length > 0 ? <TypeGrid title="TIPOS" items={typeMatches} onPick={pickTypeFromGrid} /> : null}
          {entities.length > 0 ? (
            <>
              <GroupTitle>ENTIDADES</GroupTitle>
              <View style={listCard}>
                {entities.slice(0, 8).map((e, i) => (
                  <EntityRow key={e.id} entity={e} last={i === Math.min(entities.length, 8) - 1} onPress={() => pickEntity(e)} />
                ))}
              </View>
            </>
          ) : null}
          {typeMatches.length === 0 && entities.length === 0 ? (
            <Text style={{ color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 }}>
              No está "{query}" en el catálogo: elige el tipo y ponle ese nombre. Nadie queda por fuera.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {groups.map((g) => (g.items.length ? <TypeGrid key={g.title} title={g.title} items={g.items} onPick={pickTypeFromGrid} /> : null))}
          {others.length > 0 ? (
            showAllTypes ? (
              <TypeGrid title="OTROS TIPOS" items={others} onPick={pickTypeFromGrid} />
            ) : (
              <Pressable
                onPress={() => setShowAllTypes(true)}
                accessibilityRole="button"
                style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>
                  Ver más tipos ({others.map((t) => splitLabel(t.label).main.toLowerCase()).slice(0, 3).join(', ')}…)
                </Text>
              </Pressable>
            )
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const listCard = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  overflow: 'hidden' as const,
};

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.sm }}>
      {children}
    </Text>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: spacing.md, backgroundColor: colors.surface,
      }}
    >
      <Ico name="search" color={colors.textMuted} size={18} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={placeholder}
        style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: spacing.sm }}
      />
    </View>
  );
}

function TypeBadge({ debtType, size = 34 }: { debtType: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ico name={TYPE_ICON[debtType] ?? 'ellipsis-horizontal-circle-outline'} color={colors.primary} size={size / 2} />
    </View>
  );
}

function TypeGrid({ title, items, onPick }: { title: string; items: ProductTypeDescriptor[]; onPick: (t: ProductTypeDescriptor) => void }) {
  return (
    <>
      <GroupTitle>{title}</GroupTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((t) => {
          const { main, sub } = splitLabel(t.label);
          return (
            <Pressable
              key={t.debtType}
              onPress={() => onPick(t)}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              style={({ pressed }) => ({
                flexBasis: '47%', flexGrow: 1, minHeight: 92, padding: 12, gap: 8,
                borderRadius: radius.md, borderWidth: 1,
                borderColor: pressed ? colors.primary : colors.border,
                backgroundColor: pressed ? colors.primarySoft : colors.surface,
                justifyContent: 'space-between',
              })}
            >
              <TypeBadge debtType={t.debtType} />
              <View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{main}</Text>
                {sub ? <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>{sub}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function EntityRow({ entity, last, onPress }: { entity: FinancialEntity; last: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.surfaceAlt,
      }}
    >
      <Monogram name={entity.name} />
      <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{entity.name}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {CATEGORY[entity.type] ?? 'Financiera'}
        {entity.isGlobal ? '' : ' · tuya'}
      </Text>
      <Ico name="chevron-forward" color={colors.textFaint} size={16} />
    </Pressable>
  );
}

/** Monograma de respaldo (sin logos remotos): inicial sobre verde suave (opción D). */
function Monogram({ name }: { name: string }) {
  return (
    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** Renderiza un campo del alta según su `kind` declarado en el descriptor. */
const ORIGINAL_AMOUNT_FIELD: ProductFieldSpec = {
  key: 'originalAmount',
  label: '¿Cuánto te prestaron al inicio? (opcional, para ver tu avance)',
  kind: 'money',
  placeholder: 'Ej: 80.000.000',
};

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
