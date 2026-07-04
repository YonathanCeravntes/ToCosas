import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Row, Screen } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
import { formatDate, formatMoney, formatPercent } from '../../utils/format';
import { toNumber } from '../../api/types';
import { debtsApi } from '../../api/endpoints';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtsList'>;

export function DebtsListScreen({ navigation }: Props) {
  const { data, loading, error, reload } = useApi(() => debtsApi.list(), []);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <Screen>
      <Button title="+ Nueva deuda" onPress={() => navigation.navigate('AddDebt')} />
      {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
      <FlatList
        style={{ marginTop: spacing.md }}
        data={data ?? []}
        keyExtractor={(d) => d.id}
        refreshing={loading}
        onRefresh={reload}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
              Aún no tienes deudas. Agrega la primera para ver tu plan de pago.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('DebtDetail', { debtId: item.id, name: item.name })}
          >
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                  {formatMoney(toNumber(item.currentBalance))}
                </Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: colors.textMuted }}>
                  {formatPercent(toNumber(item.interestRate))} {item.rateBasis}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  Cuota {formatMoney(toNumber(item.monthlyPayment))}
                </Text>
              </Row>
              {item.projection?.payoffDate ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                  🏁 Terminas de pagar el {formatDate(item.projection.payoffDate)}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
