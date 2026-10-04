import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, ErrorState, Field, FormScroll, GroupLabel, Ico, IconButton, IconName, Money, ProgressBar, Row } from '../components/ui';
import { colors, radius, spacing, type as typo } from '../theme/colors';
import { formatMoney, parseAmount } from '../utils/format';
import { Account, AccountType, Asset, AssetType, DebtsSummary, NetWorth, toNumber } from '../api/types';
import { accountsApi, debtsApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';
import { confirmRemove } from '../utils/confirm';

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
  { key: 'cesantias', label: 'Cesantías' },
];

export function AccountsScreen() {
  const { data: nw, loading, error, reload } = useApi(() => accountsApi.netWorth(), [], { cacheKey: 'net-worth' });
  const { data: accounts, reload: reloadAcc } = useApi(() => accountsApi.listAccounts(), []);
  const { data: assets, reload: reloadAss } = useApi(() => accountsApi.listAssets(), []);
  const { data: debts, reload: reloadDebts } = useApi(() => debtsApi.summary(), []);

  const refresh = React.useCallback(
    () => Promise.all([reload(), reloadAcc(), reloadAss(), reloadDebts()]),
    [reload, reloadAcc, reloadAss, reloadDebts],
  );

  useFocusEffect(React.useCallback(() => { void refresh(); }, [refresh]));

  return (
    <FormScroll onRefresh={refresh}>
      {error && !nw ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
      <NetWorthCard nw={nw} loading={loading} />
      <AccountsSection accounts={accounts ?? []} onChange={refresh} />
      <AssetsSection assets={assets ?? []} onChange={refresh} />
      <DebtsLink summary={debts} />
    </FormScroll>
  );
}

/** §39: saldo con signo (una cuenta corriente puede ir en negativo). */
function parseSignedAmount(input: string): number {
  const negative = input.trim().startsWith('-');
  const abs = parseAmount(input);
  if (Number.isNaN(abs)) return 0;
  return negative ? -abs : abs;
}

/**
 * Cuentas · opción 1 (Fundador, 2026-09-29): tarjeta blanca "tienes contra debes".
 * Las barras comparan contra la mayor de las dos cifras (la más grande llena la barra).
 */
function NetWorthCard({ nw, loading }: { nw: NetWorth | null; loading: boolean }) {
  const negative = (nw?.netWorth ?? 0) < 0;
  const have = Math.max(0, nw?.totalAssets ?? 0);
  const owe = Math.max(0, nw?.totalLiabilities ?? 0);
  const top = Math.max(have, owe, 1);
  return (
    <Card>
      <Text style={{ color: colors.textMuted, ...typo.small }}>Tu patrimonio · lo tuyo menos lo que debes</Text>
      {nw || !loading ? (
        <Money value={nw ? nw.netWorth : 0} size={32} color={negative ? colors.dangerDeep : colors.text} style={{ marginTop: 2 }} />
      ) : (
        <Text style={{ color: colors.textFaint, fontSize: 32, fontWeight: '600', marginTop: 2 }}>…</Text>
      )}
      {nw ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <View style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, ...typo.small }}>Tienes</Text>
              <Text style={{ color: colors.text, ...typo.small, fontWeight: '600' }}>{formatMoney(nw.totalAssets)}</Text>
            </Row>
            <ProgressBar value={have / top} color={colors.primary} track={colors.surfaceAlt} height={6} label="Lo que tienes" />
          </View>
          <View style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, ...typo.small }}>Debes</Text>
              <Text style={{ color: colors.text, ...typo.small, fontWeight: '600' }}>{formatMoney(nw.totalLiabilities)}</Text>
            </Row>
            {/* FIN-060: deudas en azul (serie de deudas), no en rojo. */}
            <ProgressBar value={owe / top} color={colors.debt} track={colors.surfaceAlt} height={6} label="Lo que debes" />
          </View>
          <Text style={{ color: colors.textFaint, ...typo.small }}>
            Liquidez (lo que puedes usar ya): {formatMoney(nw.totalLiquid)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const ACC_LABEL: Record<string, string> = { ahorros: 'Ahorros', efectivo: 'Efectivo', corriente: 'Corriente', billetera: 'Billetera', otro: 'Otra' };
const ASSET_LABEL: Record<string, string> = { inmueble: 'Inmueble', vehiculo: 'Vehículo', inversion: 'Inversión', negocio: 'Negocio', cesantias: 'Cesantías', otro: 'Otro' };

/** Invitación cuando la lista está vacía (tocarla abre el formulario). */
function EmptyInvite({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.sm,
        borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, backgroundColor: colors.surface,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ico name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, ...typo.body, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.textFaint, ...typo.small }}>{body}</Text>
      </View>
    </Pressable>
  );
}

function TypeChips<T extends string>({ options, value, onChange }: { options: Array<{ key: T; label: string }>; value: T; onChange: (t: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
      {options.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === t.key }}
          style={{
            minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.full,
            backgroundColor: value === t.key ? colors.primary : colors.surface,
            borderWidth: 1, borderColor: value === t.key ? colors.primary : colors.border,
          }}
        >
          <Text style={{ color: value === t.key ? colors.textInverse : colors.text, ...typo.small, fontWeight: value === t.key ? '600' : '500' }}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Estilo de fila dentro de una sola tarjeta (mismo patrón que Mis deudas/Movimientos). */
const rowDivider = (first: boolean) => ({ borderTopWidth: first ? 0 : 1, borderTopColor: colors.border, paddingVertical: 12 });

function AccountsSection({ accounts, onChange }: { accounts: Account[]; onChange: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ahorros');
  const [balance, setBalance] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const add = async () => {
    const value = parseSignedAmount(balance);
    if (!name.trim()) return;
    setError(null);
    try {
      await accountsApi.createAccount({ name: name.trim(), type, currentBalance: value, isEmergencyFund: emergency });
      setName(''); setBalance(''); setEmergency(false); setAdding(false);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveBalance = async (id: string) => {
    const value = parseSignedAmount(editVal);
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
    <>
      <GroupLabel title="Tus cuentas" action={adding ? 'Cerrar' : '+ Agregar'} onAction={() => setAdding(!adding)} />
      {accounts.length === 0 && !adding ? (
        <EmptyInvite
          icon="business-outline"
          title="Agrega tu cuenta de ahorros o efectivo"
          body="Márcala como fondo de emergencia y sube tu Score."
          onPress={() => setAdding(true)}
        />
      ) : null}
      {accounts.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          {accounts.map((a, i) => (
            <View key={a.id} style={rowDivider(i === 0)}>
              <Row style={{ gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, ...typo.body, fontWeight: '600' }}>{a.name}</Text>
                  <Text style={{ color: colors.textFaint, ...typo.small }}>
                    {ACC_LABEL[a.type] ?? a.type}
                    {a.isEmergencyFund ? ' · fondo de emergencia' : ''}
                  </Text>
                </View>
                {editId === a.id ? null : (
                  <Pressable
                    onPress={() => { setEditId(a.id); setEditVal(String(toNumber(a.currentBalance))); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar saldo de ${a.name}`}
                  >
                    <Row style={{ gap: 6 }}>
                      <Text style={{ ...typo.body, fontWeight: '600', color: colors.text }}>{formatMoney(toNumber(a.currentBalance))}</Text>
                      <Ico name="pencil-outline" size={13} color={colors.primary} />
                    </Row>
                  </Pressable>
                )}
                <IconButton
                  icon="trash-outline"
                  label={`Eliminar ${a.name}`}
                  onPress={() => confirmRemove(a.name, 'Su saldo dejará de contar en tu patrimonio.', () => accountsApi.removeAccount(a.id).then(onChange))}
                />
              </Row>
              {editId === a.id ? (
                <Row style={{ marginTop: 6, gap: spacing.sm }}>
                  <TextInput
                    value={editVal}
                    onChangeText={setEditVal}
                    keyboardType="numeric"
                    accessibilityLabel={`Nuevo saldo de ${a.name}`}
                    style={{ flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, ...typo.body }}
                  />
                  <Button title="Guardar" onPress={() => saveBalance(a.id)} />
                </Row>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {adding ? (
        <Card>
          <Text style={{ ...typo.title, marginBottom: spacing.sm, color: colors.text }}>Nueva cuenta</Text>
          <TypeChips options={ACC_TYPES} value={type} onChange={setType} />
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ahorros Bancolombia" />
          <Field label="Saldo" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="1.500.000" />
          <Pressable
            onPress={() => setEmergency(!emergency)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: emergency }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm }}
          >
            <Ico name={emergency ? 'checkbox' : 'square-outline'} size={22} color={emergency ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...typo.body, fontWeight: '600' }}>Es mi fondo de emergencia</Text>
              <Text style={{ color: colors.textFaint, ...typo.small }}>Sube tu pilar "Tu colchón" en Salud</Text>
            </View>
          </Pressable>
          {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          <Button title="Agregar cuenta" onPress={async () => { await add(); }} />
        </Card>
      ) : null}
    </>
  );
}

function AssetsSection({ assets, onChange }: { assets: Asset[]; onChange: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('inmueble');
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // FIN-056 (BT-034): el valor de un activo se actualiza en sitio (antes: borrar y crear).
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const add = async () => {
    const v = parseAmount(value) || 0; // §39
    setError(null);
    if (!name.trim() || !v) return setError('Escribe el nombre y el valor.');
    try {
      await accountsApi.createAsset({ name: name.trim(), type, currentValue: v });
      setName(''); setValue(''); setAdding(false);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveValue = async (id: string) => {
    const v = parseAmount(editVal) || 0;
    setError(null);
    if (!v) return setError('Escribe el valor de hoy.');
    try {
      await accountsApi.updateAsset(id, { currentValue: v });
      setEditId(null); setEditVal('');
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <GroupLabel title="Tus activos" action={adding ? 'Cerrar' : '+ Agregar'} onAction={() => setAdding(!adding)} />
      {assets.length === 0 && !adding ? (
        <EmptyInvite icon="home-outline" title="Casa, carro, inversiones…" body="Lo que tienes y vale plata." onPress={() => setAdding(true)} />
      ) : null}
      {error && !adding ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      {assets.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          {assets.map((a, i) => (
            <View key={a.id} style={rowDivider(i === 0)}>
              <Row style={{ gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, ...typo.body, fontWeight: '600' }}>{a.name}</Text>
                  <Text style={{ color: colors.textFaint, ...typo.small }}>{ASSET_LABEL[a.type] ?? a.type}</Text>
                </View>
                {editId === a.id ? null : (
                  <Pressable onPress={() => { setEditId(a.id); setEditVal(String(Math.round(toNumber(a.currentValue)))); }} accessibilityRole="button" accessibilityLabel={`Actualizar el valor de ${a.name}`}>
                    <Row style={{ gap: 6 }}>
                      <Text style={{ ...typo.body, fontWeight: '600', color: colors.text }}>{formatMoney(toNumber(a.currentValue))}</Text>
                      <Ico name="pencil-outline" size={13} color={colors.primary} />
                    </Row>
                  </Pressable>
                )}
                <IconButton
                  icon="trash-outline"
                  label={`Eliminar ${a.name}`}
                  onPress={() => confirmRemove(a.name, 'Su valor dejará de contar en tu patrimonio.', () => accountsApi.removeAsset(a.id).then(onChange))}
                />
              </Row>
              {editId === a.id ? (
                <Row style={{ marginTop: 6, gap: spacing.sm }}>
                  <TextInput
                    value={editVal}
                    onChangeText={setEditVal}
                    keyboardType="numeric"
                    accessibilityLabel={`Nuevo valor de ${a.name}`}
                    style={{ flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, ...typo.body }}
                  />
                  <Button title="Guardar" onPress={() => void saveValue(a.id)} />
                </Row>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
      {adding ? (
        <Card>
          <Text style={{ ...typo.title, marginBottom: spacing.sm, color: colors.text }}>Nuevo activo</Text>
          <TypeChips options={ASSET_TYPES} value={type} onChange={setType} />
          {type === 'cesantias' ? (
            <Text style={{ color: colors.textMuted, ...typo.small, marginTop: spacing.xs }}>
              Suman a tu patrimonio, pero no son plata disponible: solo se retiran para vivienda, educación o al terminar tu contrato. Por eso no cuentan como colchón.
            </Text>
          ) : null}
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Apartamento" />
          <Field label="Valor" value={value} onChangeText={setValue} keyboardType="numeric" placeholder="250.000.000" />
          {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          <Button title="Agregar activo" onPress={() => void add()} />
        </Card>
      ) : null}
    </>
  );
}

/** Puente a Mis deudas: el "Debes" de arriba, con su detalle a un toque. */
function DebtsLink({ summary }: { summary: DebtsSummary | null }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!summary || summary.debtsCount === 0) return null;
  return (
    <>
      <GroupLabel title="Tus deudas" />
      <Pressable
        onPress={() => navigation.navigate('Main', { screen: 'Debts', params: { screen: 'DebtsList' } })}
        accessibilityRole="button"
        accessibilityLabel="Ver mis deudas"
      >
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, ...typo.body, fontWeight: '600' }}>
              {summary.debtsCount} deuda{summary.debtsCount === 1 ? '' : 's'}
            </Text>
            <Row style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.text, ...typo.body, fontWeight: '600' }}>{formatMoney(summary.totalDebt)}</Text>
              <Ico name="chevron-forward" size={16} color={colors.textFaint} />
            </Row>
          </Row>
        </Card>
      </Pressable>
    </>
  );
}
