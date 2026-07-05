import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Card, Row } from '../components/ui';
import { colors, spacing } from '../theme/colors';
import { gamificationApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

/** Pantalla de Logros (FIN-008 §8): transparencia total de cómo ganarlos. */
export function AchievementsScreen() {
  const { data } = useApi(() => gamificationApi.profile(), []);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      {data ? (
        <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.textInverse, opacity: 0.85 }}>
                Nivel {data.level.number} · {data.level.name}
              </Text>
              <Text style={{ color: colors.textInverse, fontSize: 28, fontWeight: '800' }}>
                {data.xp} XP
              </Text>
              {data.level.nextAt ? (
                <Text style={{ color: colors.textInverse, opacity: 0.8, fontSize: 12 }}>
                  Siguiente nivel a {data.level.nextAt} XP
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 30 }}>🔥</Text>
              <Text style={{ color: colors.textInverse, fontWeight: '800' }}>
                {data.streak.current} sem
              </Text>
              <Text style={{ color: colors.textInverse, opacity: 0.8, fontSize: 11 }}>
                mejor: {data.streak.best}
              </Text>
            </View>
          </Row>
        </Card>
      ) : null}

      {(data?.achievements ?? []).map((a) => {
        const unlocked = !!a.unlockedAt;
        return (
          <Card key={a.code} style={{ opacity: unlocked ? 1 : 0.55, paddingVertical: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {unlocked ? '🏆' : '🔒'} {a.title}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {a.condition}
                </Text>
              </View>
              <Text style={{ fontWeight: '800', color: unlocked ? colors.primary : colors.textMuted }}>
                +{a.xp} XP
              </Text>
            </Row>
          </Card>
        );
      })}
    </ScrollView>
  );
}
