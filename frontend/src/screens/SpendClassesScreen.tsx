import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { Card, ErrorState, FormScroll, GroupLabel, Pill, Row, Skeleton } from '../components/ui';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../theme/colors';
import { spendingApi } from '../api/endpoints';
import { SpendClassRow } from '../api/types';

const GROUPS: Array<{ key: SpendClassRow['spendClass']; title: string; hint: string }> = [
  { key: 'esencial', title: 'Esencial', hint: 'Lo que no se puede dejar de pagar.' },
  { key: 'mixto', title: 'Tú decides', hint: 'Depende de cada quien: dinos si para ti es esencial o un gusto.' },
  { key: 'gusto', title: 'Gustos', hint: 'Lo que disfrutas. Millo nunca te dirá que lo quites.' },
];

/** Selector de dos opciones (Esencial · Gusto). */
function Toggle({ value, onChange }: { value: 'esencial' | 'gusto' | null; onChange: (v: 'esencial' | 'gusto') => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.full, padding: 2 }}>
      {(['esencial', 'gusto'] as const).map((v) => {
        const on = value === v;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: on ? colors.surface : 'transparent' }}
          >
            <Text style={{ color: on ? colors.text : colors.textFaint, fontSize: 12, fontWeight: '600' }}>{v === 'esencial' ? 'Esencial' : 'Gusto'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * FIN-061 Fase 2.2 · Esencial y gustos (boceto aprobado 2026-10-04). Así separa Millo
 * la plata; la persona lo cambia y marca lo que la sostiene (protegido: Millo nunca
 * sugiere espaciarlo).
 */
export function SpendClassesScreen() {
  const [rows, setRows] = useState<SpendClassRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setRows(await spendingApi.classes());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const update = async (row: SpendClassRow, input: { spendClass?: 'esencial' | 'gusto' | null; protected?: boolean }) => {
    // Optimista: se ve al instante y se corrige si el servidor dice otra cosa.
    setRows((rs) => rs?.map((r) => (r.categoryId === row.categoryId ? { ...r, ...input, spendClass: input.spendClass === undefined ? r.spendClass : input.spendClass ?? r.suggested } : r)) ?? rs);
    try {
      const saved = await spendingApi.updateClass(row.categoryId, input);
      setRows((rs) => rs?.map((r) => (r.categoryId === saved.categoryId ? saved : r)) ?? rs);
    } catch (e) {
      setError((e as Error).message);
      void load();
    }
  };

  if (error && !rows) return <FormScroll><ErrorState message={error} onRetry={() => void load()} /></FormScroll>;
  if (!rows) return <FormScroll><Skeleton lines={6} /></FormScroll>;

  return (
    <FormScroll onRefresh={load}>
      <Text style={{ color: colors.textMuted, ...type.body, marginBottom: spacing.xs }}>
        Así separa Millo tu plata. Cámbialo si para ti es distinto.
      </Text>
      {GROUPS.map((g) => {
        const list = rows.filter((r) => (g.key === 'mixto' ? r.suggested === 'mixto' : r.suggested === g.key));
        if (list.length === 0) return null;
        return (
          <View key={g.key}>
            <GroupLabel title={g.title} />
            <Text style={{ color: colors.textFaint, ...type.small, marginTop: -spacing.xs, marginBottom: spacing.sm }}>{g.hint}</Text>
            <Card style={{ paddingVertical: 0 }}>
              {list.map((r, i) => {
                const chosen = r.spendClass === 'mixto' ? null : r.spendClass;
                return (
                  <View key={r.categoryId} style={{ paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt, gap: 6 }}>
                    <Row style={{ gap: spacing.sm }}>
                      <CategoryGlyph emoji={r.icon} kind="gasto" size="sm" />
                      <Text style={{ color: colors.text, ...type.body, fontWeight: '600', flex: 1 }} numberOfLines={1}>{r.name}</Text>
                      {g.key === 'mixto' || chosen !== r.suggested ? (
                        <Toggle value={chosen} onChange={(v) => void update(r, { spendClass: v === r.suggested ? null : v })} />
                      ) : (
                        <Pressable onPress={() => void update(r, { spendClass: r.suggested === 'esencial' ? 'gusto' : 'esencial' })} accessibilityRole="button" accessibilityLabel={`Cambiar ${r.name}`}>
                          <Pill label={r.spendClass === 'esencial' ? 'Esencial' : 'Gusto'} tone={r.spendClass === 'esencial' ? 'neutral' : 'gold'} />
                        </Pressable>
                      )}
                    </Row>
                    {r.spendClass === 'gusto' ? (
                      <Row style={{ justifyContent: 'space-between', paddingLeft: 38 }}>
                        <Text style={{ color: r.protected ? colors.primary : colors.textFaint, ...type.small, fontWeight: r.protected ? '600' : '400', flex: 1 }}>
                          {r.protected ? 'Esto me sostiene · Millo no te sugerirá espaciarlo' : 'Esto me sostiene'}
                        </Text>
                        <Switch
                          value={r.protected}
                          onValueChange={(v) => void update(r, { protected: v })}
                          trackColor={{ true: colors.primary, false: colors.border }}
                          accessibilityLabel={`${r.name}: esto me sostiene`}
                        />
                      </Row>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          </View>
        );
      })}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginVertical: spacing.lg }}>
        Lo esencial cuenta para tu colchón; los gustos, para ver si van a tu ritmo. Nada de esto se le muestra a nadie más.
      </Text>
    </FormScroll>
  );
}
