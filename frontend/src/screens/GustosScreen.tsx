import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, EmptyState, ErrorState, FormScroll, GroupLabel, HeroCard, Ico, LinkRow, Money, PaceBar, Pill, Row, Skeleton } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { spendingApi } from '../api/endpoints';
import { ConsumptionAnalysis, ConsumptionSuggestion } from '../api/types';
import { RootStackParamList } from '../navigation/types';

const BAND_LABEL = { tranquilo: 'Tranquilo', atencion: 'Atención', alto: 'Alto' } as const;
const BAND_TONE = { tranquilo: 'ok', atencion: 'warn', alto: 'neg' } as const;
const pct = (f: number) => `${Math.round(f * 100)} %`;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * FIN-061 Fase 2.3 · Tus gustos este mes (boceto aprobado 2026-10-04). La banda
 * depende de tu carga de deuda; cada gusto se compara contigo mismo; por defecto
 * Millo se queda callado; máximo 2 sugerencias y siempre "Este gusto lo mantengo".
 */
export function GustosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<ConsumptionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setData(await spendingApi.consumption());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const keep = async (s: ConsumptionSuggestion) => {
    if (!s.categoryId) return;
    try {
      await spendingApi.updateClass(s.categoryId, { protected: true });
      setKept('Listo: lo marcamos como algo que te sostiene. No te lo volveremos a sugerir.');
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error && !data) return <FormScroll><ErrorState message={error} onRetry={() => void load()} /></FormScroll>;
  if (!data) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={4} /></FormScroll>;

  const g = data.gustos;
  const month = MONTHS[Number(data.month.slice(5, 7)) - 1] ?? '';
  const gustoCats = data.categories.filter((c) => c.spendClass === 'gusto' && (c.amount > 0 || (c.typicalAmount ?? 0) > 0)).sort((a, b) => b.amount - a.amount);

  return (
    <FormScroll onRefresh={load}>
      <HeroCard>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.onPrimaryFaint, ...type.label }}>Gustos de {month}</Text>
          {g.band ? (
            <View style={{ backgroundColor: colors.onPrimaryTrack, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ color: colors.textInverse, fontSize: 11.5, fontWeight: '600' }}>{BAND_LABEL[g.band]}</Text>
            </View>
          ) : null}
        </Row>
        <Money value={g.amount} color={colors.textInverse} size={30} style={{ marginTop: 6 }} />
        {g.share != null ? (
          <Text style={{ color: colors.onPrimaryMuted, ...type.small, marginTop: 4 }}>
            {pct(g.share)} de tu ingreso · tu zona tranquila es hasta {pct(g.limits.tranquilo)}
            {g.limits.tranquilo < 0.25 ? ' porque tus cuotas pesan' : ''}
          </Text>
        ) : (
          <Text style={{ color: colors.onPrimaryMuted, ...type.small, marginTop: 4 }}>Registra tu ingreso para ver tu zona tranquila.</Text>
        )}
      </HeroCard>

      {kept ? (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <Text style={{ color: colors.primaryDark, ...type.small, fontWeight: '600' }}>{kept}</Text>
        </Card>
      ) : null}

      {data.wins.map((w) => (
        <Card key={w}>
          <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ico name="leaf-outline" color={colors.primary} size={16} />
            <Text style={{ color: colors.text, ...type.small, flex: 1 }}>{w}</Text>
          </Row>
        </Card>
      ))}

      {data.suggestions.map((s) => (
        <Card key={`${s.kind}-${s.categoryId ?? ''}`}>
          <Text style={{ color: colors.text, ...type.title, fontSize: 15 }}>{s.title}</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>{s.body}</Text>
          {s.canKeep && s.categoryId ? (
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Este gusto lo mantengo" variant="secondary" icon="heart-outline" onPress={() => void keep(s)} />
            </View>
          ) : null}
        </Card>
      ))}
      {data.suggestions.length > 0 ? (
        <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
          Máximo 2 sugerencias al mes. Es para espaciar, nunca para quitar.
        </Text>
      ) : (
        <Card>
          <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ico name="checkmark-circle-outline" color={colors.primary} size={16} />
            <Text style={{ color: colors.text, ...type.small, flex: 1 }}>Tus gustos van a tu ritmo. Disfrútalos: no hay nada que ajustar este mes.</Text>
          </Row>
        </Card>
      )}

      {data.notes.map((n) => (
        <Card key={`${n.kind}-${n.categoryId ?? ''}`} style={{ backgroundColor: n.kind === 'tarjeta_interes' ? colors.warningSoft : colors.surface }}>
          <Text style={{ color: n.kind === 'tarjeta_interes' ? colors.warningDeep : colors.textMuted, ...type.small }}>{n.text}</Text>
        </Card>
      ))}

      <GroupLabel title="Tus gustos contra tu ritmo" />
      {gustoCats.length === 0 ? (
        <EmptyState icon="cafe-outline" title="Aún no hay gustos este mes" body="Cuando registres salidas, domicilios o cafés, aquí verás si van a tu ritmo." />
      ) : (
        <Card>
          {gustoCats.map((c, i) => {
            const typical = c.typicalAmount ?? 0;
            const max = Math.max(c.amount, typical * 1.5, 1);
            const tone = c.status === 'pico' ? colors.warning : colors.primary;
            return (
              <View key={c.categoryId} style={{ paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, ...type.body, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                    {c.name}
                    {c.count > 0 ? <Text style={{ color: colors.textFaint, fontWeight: '400' }}>{`  ${c.count} ${c.count === 1 ? 'vez' : 'veces'}`}</Text> : null}
                  </Text>
                  <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{formatMoney(c.amount)}</Text>
                </Row>
                <PaceBar used={c.amount / max} ideal={typical > 0 ? typical / max : undefined} color={tone} />
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textFaint, ...type.caption }}>
                    {c.typicalAmount != null ? `Lo usual para ti: ${formatMoney(c.typicalAmount)}` : 'Aún sin historial'}
                    {c.monthlyCap ? ` · tope ${formatMoney(c.monthlyCap)}` : ''}
                  </Text>
                  {c.protected ? <Pill label="Te sostiene" tone="ok" /> : null}
                </Row>
              </View>
            );
          })}
        </Card>
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs }}>
        La raya negra es lo usual para ti (mediana de tus últimos 3 meses). Te comparas contigo, no con nadie más.
      </Text>

      <LinkRow title="Qué es esencial y qué es gusto para ti" onPress={() => navigation.navigate('SpendClasses')} />
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginVertical: spacing.lg }}>
        Orientación educativa con tus datos; no es asesoría financiera regulada.
      </Text>
    </FormScroll>
  );
}
