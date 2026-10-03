import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { Card, ErrorState, FormScroll, Ico, ProgressBar, Row, Skeleton } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { gamificationApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

/** Pantalla de Logros (FIN-008 §8): transparencia total de cómo ganarlos.
 *  FIN-060: tarjeta blanca con XP protagonista; el dorado marca logros y racha. */
export function AchievementsScreen() {
  const { data, loading, error, reload } = useApi(() => gamificationApi.profile(), []);
  const achievements = data?.achievements ?? [];

  return (
    <FormScroll onRefresh={reload}>
      {error && !data ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {loading && !data ? <Skeleton hero lines={3} /> : null}
      {data ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: colors.textFaint, ...type.label }}>
                Nivel {data.level.number} · {data.level.name}
              </Text>
              <Row style={{ alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <Text style={{ color: colors.text, ...type.display, fontVariant: ['tabular-nums'] }}>{data.xp}</Text>
                <Text style={{ color: colors.textFaint, ...type.bodyLg, fontWeight: '600' }}>XP</Text>
              </Row>
              {data.level.nextAt ? (
                <Text style={{ color: colors.textMuted, ...type.small }}>
                  Siguiente nivel a {data.level.nextAt} XP
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ico name="flame-outline" size={18} color={colors.goldText} />
              </View>
              <Text style={{ color: colors.text, fontWeight: '600', marginTop: 4 }}>
                {data.streak.current} semana{data.streak.current === 1 ? '' : 's'}
              </Text>
              <Text style={{ color: colors.textFaint, ...type.caption }}>
                seguidas · mejor: {data.streak.best}
              </Text>
            </View>
          </Row>
          {data.level.nextAt ? (
            <View style={{ marginTop: spacing.md }}>
              <ProgressBar
                value={data.xp / data.level.nextAt}
                color={colors.gold}
                track={colors.surfaceAlt}
                height={6}
                label="Avance al siguiente nivel"
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      {achievements.length ? (
        <Card style={{ paddingVertical: 0 }}>
          {achievements.map((a, i) => {
            const unlocked = !!a.unlockedAt;
            return (
              <View
                key={a.code}
                style={{ opacity: unlocked ? 1 : 0.55, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}
              >
                <Row style={{ gap: spacing.sm + 2 }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      backgroundColor: unlocked ? colors.goldSoft : colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unlocked ? (
                      <Ico name="trophy-outline" size={15} color={colors.goldText} />
                    ) : (
                      <Ico name="lock-closed-outline" size={15} color={colors.textFaint} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }}>{a.title}</Text>
                    <Text style={{ color: colors.textMuted, ...type.small, marginTop: 1 }}>
                      {a.condition}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: '600', color: unlocked ? colors.goldText : colors.textFaint, fontVariant: ['tabular-nums'] }}>
                    +{a.xp} XP
                  </Text>
                </Row>
              </View>
            );
          })}
        </Card>
      ) : null}
    </FormScroll>
  );
}
