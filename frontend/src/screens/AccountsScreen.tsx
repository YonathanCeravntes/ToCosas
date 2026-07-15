import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Field, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { Account, AccountType, Asset, AssetType, NetWorth, toNumber } from '../api/types';
import { accountsApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

const ACC_TYPES: Array<{ key: AccountType; label: string }> = [
  { key: 'ahorros', label: 'Ahorros' },
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'corriente', label: 'Corriente' },
  { key: 'billetera', label: 'Billetera' },
];
const ASSET_TYPES: Array<{ key: AssetType; label: string }> = [
  { key: 'inmueble', label: 'Inmueble' },
  { key: 'vehiculo', label: 'Vehículo' },
  { key: 'inversion', label: 'Inversión' },
  { key: 'negocio', label: 'Negocio' },
];

export function AccountsScreen() {
  const { data: nw, loading, reload } = useApi(() => accountsApi.netWorth(), []);
  const { data: accounts, reload: reloadAcc } = useApi(() => accountsApi.listAccounts(), []);
  const { data: assets, reload: reloadAss } = useApi(() => accountsApi.listAssets(), []);

  const refresh = React.useCallback(() => {
    void reload();
    void reloadAcc();
    void reloadAss();
  }, [reload, reloadAcc, reloadAss]);

  useFocusEffect(React.useCallback(() => refresh(), [refresh]));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <NetWorthCard nw={nw} loading={loading} />
      <AccountsSection accounts={accounts ?? []} onChange={refresh} />
      <AssetsSection assets={assets ?? []} onChange={refresh} />
    </ScrollView>
  );
}

function NetWorthCard({ nw, loading }: { nw: NetWorth | null; loading: boolean }) {
  const negative = (nw?.netWorth ?? 0) < 0;
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Tu patrimonio</Text>
      <Text style={{ color: negative ? colors.accent : colors.textInverse, fontSize: 32, fontWeight: '800' }}>
        {nw ? formatMoney(nw.netWorth) : loading ? '…' : formatMoney(0)}
      </Text>
      {nw ? (
        <View style={{ marginTop: spacing.sm, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Activos + saldos</Text>
            <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{formatMoney(nw.totalAssets)}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textInverse, opacity: 0.85 }}>− Deudas</Text>
            <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{formatMoney(nw.totalLiabilities)}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Liquidez</Text>
            <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{formatMoney(nw.totalLiquid)}</Text>
          </Row>
        </View>
      ) : null}
    </Card>
  );
}

function AccountsSection({ accounts, onChange }: { accounts: Account[]; onChange: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ahorros');
  const [balance, setBalance] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const value = parseFloat(balance.replace(/[^\d.-]/g, '')) || 0;
    if (!name.trim()) return;
    setError(null);
    try {
      await accountsApi.createAccount({ name: name.trim(), type, currentBalance: value, isEmergencyFund: emergency });
      setName(''); setBalance(''); setEmergency(false);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveBalance = async (id: string) => {
    const value = parseFloat(editVal.replace(/[^\d.-]/g, '')) || 0;
    setError(null);
    try {
      await accountsApi.updateBalance(id, value);
      setEditId(null); setEditVal('');
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>🏦 Cuentas</Text>
      {accounts.map((a) => (
        <View key={a.id} style={{ marginBottom: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {a.name} {a.isEmergencyFund ? '🛟' : ''}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{a.type}</Text>
            </View>
            {editId === a.id ? null : (
              <Pressable onPress={() => { setEditId(a.id); setEditVal(String(toNumber(a.currentBalance))); }}>
                <Text style={{ fontWeight: '800', color: colors.primary }}>
                  {formatMoney(toNumber(a.currentBalance))} ✏️
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => accountsApi.removeAccount(a.id).then(onChange)} style={{ marginLeft: spacing.md }}>
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>🗑️</Text>
            </Pressable>
          </Row>
          {editId === a.id ? (
            <Row style={{ marginTop: 6 }}>
              <TextInput
                value={editVal}
                onChangeText={setEditVal}
                keyboardType="numeric"
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, color: colors.text }}
              />
              <Button title="Guardar" onPress={() => saveBalance(a.id)} />
            </Row>
          ) : null}
        </View>
      ))}

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>Nueva cuenta</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
        {ACC_TYPES.map((t) => (
          <Pressable key={t.key} onPress={() => setType(t.key)} style={{
            paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full,
            backgroundColor: type === t.key ? colors.primary : colors.surface,
            borderWidth: 1, borderColor: type === t.key ? colors.primary : colors.border,
          }}>
            <Text style={{ color: type === t.key ? colors.textInverse : colors.text, fontSize: 12 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ahorros Bancolombia" />
      <Field label="Saldo" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="1500000" />
      <Pressable onPress={() => setEmergency(!emergency)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 18 }}>{emergency ? '☑️' : '⬜'}</Text>
        <Text style={{ marginLeft: 8, color: colors.text }}>Es mi fondo de emergencia</Text>
      </Pressable>
      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Button title="Agregar cuenta" onPress={add} />
    </Card>
  );
}

function AssetsSection({ assets, onChange }: { assets: Asset[]; onChange: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('inmueble');
  const [value, setValue] = useState('');

  const add = async () => {
    const v = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
    if (!name.trim() || !v) return;
    await accountsApi.createAsset({ name: name.trim(), type, currentValue: v });
    setName(''); setValue('');
    onChange();
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>🏠 Activos</Text>
      {assets.map((a) => (
        <Row key={a.id} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text }}>{a.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{a.type}</Text>
          </View>
          <Text style={{ fontWeight: '700', color: colors.text }}>{formatMoney(toNumber(a.currentValue))}</Text>
          <Pressable onPress={() => accountsApi.removeAsset(a.id).then(onChange)} style={{ marginLeft: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>🗑️</Text>
          </Pressable>
        </Row>
      ))}
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>Nuevo activo</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
        {ASSET_TYPES.map((t) => (
          <Pressable key={t.key} onPress={() => setType(t.key)} style={{
            paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full,
            backgroundColor: type === t.key ? colors.primary : colors.surface,
            borderWidth: 1, borderColor: type === t.key ? colors.primary : colors.border,
          }}>
            <Text style={{ color: type === t.key ? colors.textInverse : colors.text, fontSize: 12 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Apartamento" />
      <Field label="Valor" value={value} onChangeText={setValue} keyboardType="numeric" placeholder="250000000" />
      <Button title="Agregar activo" onPress={add} />
    </Card>
  );
}
