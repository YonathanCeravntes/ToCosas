import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, Ico, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { AiConsentStatus, CopilotAction, CopilotMessage, Insight, InsightSeverity, Recommendation } from '../api/types';
import { budgetApi, copilotApi, insightsApi, recommendationsApi } from '../api/endpoints';
import { useBottomInset } from '../navigation/insets';

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  critical: colors.danger,
  warning: colors.warning,
  info: colors.success,
};

// FIN-046: preguntas que muestran el "cerebro" (plan de flujo, Te queda, crédito).
const STARTERS = [
  '¿Qué deuda pago primero?',
  '¿Cuánto me queda este mes?',
  '¿Me alcanza para un crédito de 10 millones?',
  '¿Por qué está así mi Score?',
];

/** Novedades guardadas antes de DEC-0040 traen emoji al inicio (🏆/🎉): se quitan al mostrar. */
const stripEmoji = (t: string) =>
  t.replace(/^(?:[\u2600-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|\uFE0F|\s)+/, '');

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'template' | 'llm';
  actions?: CopilotAction[];
}

export function CopilotScreen() {
  const bottomInset = useBottomInset(); // BT-012
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [consent, setConsent] = useState<AiConsentStatus | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  // FIN-046: permiso de un toque al entrar (se puede posponer en esta visita).
  const [consentLater, setConsentLater] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const listRef = useRef<FlatList<ChatItem>>(null);

  // BP-03: novedades y recomendaciones frescas cada vez que la pantalla gana foco.
  useFocusEffect(
    useCallback(() => {
      void copilotApi.consentStatus().then(setConsent).catch(() => undefined);
      void insightsApi.list().then(setInsights).catch(() => undefined);
      void recommendationsApi.list().then(setRecommendations).catch(() => undefined);
    }, []),
  );

  const dismissRecommendation = async (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    await recommendationsApi.setStatus(id, 'dismissed').catch(() => undefined);
  };

  const markDone = async (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    await recommendationsApi.setStatus(id, 'done').catch(() => undefined);
  };

  const dismissInsight = async (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await insightsApi.setStatus(id, 'dismissed').catch(() => undefined);
  };

  const openInsight = (insight: Insight) => {
    void insightsApi.setStatus(insight.id, 'seen').catch(() => undefined);
    void send(`Cuéntame más sobre esto: "${insight.title}"`);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);
    const userItem: ChatItem = { id: `u-${Date.now()}`, role: 'user', content };
    setItems((prev) => [...prev, userItem]);
    try {
      const res = await copilotApi.send(content, conversationId);
      setConversationId(res.conversationId);
      setAiRemaining(res.aiRemainingToday);
      setItems((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: res.reply, source: res.source, actions: res.actions },
      ]);
    } catch (e) {
      setItems((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: (e as Error).message, source: 'template' },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const acceptConsent = async () => {
    await copilotApi.grantConsent();
    const status = await copilotApi.consentStatus();
    setConsent(status);
    setShowConsent(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Banner de modo */}
      <View style={{ backgroundColor: consent?.accepted ? colors.primarySoft : colors.surface, padding: spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          {consent?.accepted
            ? `IA activa${aiRemaining !== null ? ` · ${aiRemaining} mensajes IA hoy` : ''}`
            : 'Modo básico (respuestas instantáneas). Activa la IA para preguntas abiertas.'}
        </Text>
        {!consent?.accepted ? (
          <Pressable onPress={() => setShowConsent(true)}>
            <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: 2 }}>
              Activar inteligencia artificial
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
        data={items}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={
          <View>
            {/* FIN-046 (Fundador, 2026-09-29): IA para toda la Beta con permiso de un toque. */}
            {consent && !consent.accepted && !consentLater ? (
              <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
                <Text style={{ color: colors.textInverse, fontWeight: '800', fontSize: 16 }}>
                  Millo usa inteligencia artificial para responderte con tus números
                </Text>
                <Text style={{ color: colors.onPrimaryMuted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
                  Tus datos viajan resumidos: sin tu nombre, notas ni números de cuenta. Puedes quitar el permiso cuando quieras en Ajustes.
                </Text>
                <Row style={{ gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={() => void acceptConsent()}
                    accessibilityRole="button"
                    style={{ backgroundColor: colors.surface, borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 18 }}
                  >
                    <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>Acepto</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowConsent(true)} accessibilityRole="button" style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
                    <Text style={{ color: colors.textInverse, fontWeight: '700' }}>Ver detalles</Text>
                  </Pressable>
                  <Pressable onPress={() => setConsentLater(true)} accessibilityRole="button" style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
                    <Text style={{ color: colors.onPrimaryMuted }}>Ahora no</Text>
                  </Pressable>
                </Row>
              </Card>
            ) : null}
            {/* Recomendado para ti (FIN-007): acciones con beneficio cuantificado */}
            {recommendations.length > 0 ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  <Ico name="sparkles-outline" color={colors.primary} /> Recomendado para ti
                </Text>
                {recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    onDismiss={() => void dismissRecommendation(rec.id)}
                    onDone={() => void markDone(rec.id)}
                  />
                ))}
              </View>
            ) : null}
            {/* Novedades (FIN-006): insights como arrancadores con contexto */}
            {insights.length > 0 ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  <Ico name="notifications-outline" color={colors.primary} /> Novedades
                </Text>
                {insights.slice(0, 4).map((ins) => (
                  <Pressable key={ins.id} onPress={() => openInsight(ins)}>
                    <Card style={{ borderLeftWidth: 4, borderLeftColor: SEVERITY_COLOR[ins.severity], paddingVertical: spacing.sm }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={2}>
                          {stripEmoji(ins.title)}
                        </Text>
                        <Pressable onPress={() => void dismissInsight(ins.id)} style={{ paddingLeft: spacing.sm }}>
                          <Ico name="close" size={18} color={colors.textMuted} />
                        </Pressable>
                      </Row>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                        {ins.body}
                      </Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Card>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
                <Ico name="chatbubble-ellipses-outline" size={16} color={colors.primary} /> Soy tu Copiloto Financiero
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, lineHeight: 20 }}>
                Interpreto tus números y te los explico. Prueba con:
              </Text>
            </Card>
            {STARTERS.map((s) => (
              <Pressable key={s} onPress={() => void send(s)}>
                <Card style={{ paddingVertical: spacing.sm }}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{s}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        }
        renderItem={({ item }) => <Bubble item={item} />}
      />

      {/* Input */}
      <View style={{ flexDirection: 'row', padding: spacing.sm, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Pregúntame sobre tus finanzas…"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text }}
          onSubmitEditing={() => void send(input)}
          editable={!sending}
        />
        <Pressable
          onPress={() => void send(input)}
          disabled={sending}
          style={{ marginLeft: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.full, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
        >
          {sending ? <ActivityIndicator color={colors.textInverse} /> : <Ico name="send" size={18} color={colors.textInverse} />}
        </Pressable>
      </View>

      <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.md, paddingBottom: 6, backgroundColor: colors.surface }}>
        Información educativa; no es asesoría financiera regulada.
      </Text>

      {/* Modal de consentimiento (DEC-0005 §14.1) */}
      <Modal visible={showConsent} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '85%', padding: spacing.md, paddingBottom: spacing.md + bottomInset }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text, marginBottom: spacing.sm }}>
              Activar inteligencia artificial
            </Text>
            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={{ color: colors.text, lineHeight: 20, fontSize: 13 }}>
                {consent?.consentText ?? 'Cargando…'}
              </Text>
            </ScrollView>
            <Button title="Acepto y activo la IA" onPress={() => void acceptConsent()} />
            <Button title="Seguir en modo básico" variant="secondary" onPress={() => setShowConsent(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function RecommendationCard({
  rec,
  onDismiss,
  onDone,
}: {
  rec: Recommendation;
  onDismiss: () => void;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(!open)}>
      <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent, paddingVertical: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={2}>
            {rec.title}
          </Text>
          <Pressable onPress={onDismiss} style={{ paddingLeft: spacing.sm }}>
            <Ico name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Row>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }} numberOfLines={open ? undefined : 2}>
          {rec.body}
        </Text>
        {open ? (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 6 }}>
              Si no lo haces: {rec.whatIfNot}
            </Text>
            <Row style={{ gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button icon="checkmark" title="Lo hice" variant="secondary" onPress={onDone} />
              </View>
            </Row>
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Toca para ver más</Text>
        )}
      </Card>
    </Pressable>
  );
}

function Bubble({ item }: { item: ChatItem }) {
  const isUser = item.role === 'user';
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: spacing.sm }}>
      <View
        style={{
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderRadius: radius.md,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
          padding: spacing.sm,
        }}
      >
        <Text style={{ color: isUser ? colors.textInverse : colors.text, lineHeight: 20 }}>{item.content}</Text>
        {!isUser && item.source ? (
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
            {item.source === 'llm' ? 'IA' : 'instantánea'}
          </Text>
        ) : null}
      </View>
      {item.actions?.length ? (
        <View style={{ gap: 6, marginTop: 6 }}>
          {item.actions.map((a, i) => (
            <ActionButton key={i} action={a} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * FIN-046 · Una acción PROPUESTA por la IA. Nada se hace hasta que la persona toca:
 * crear un gasto fijo se confirma aquí mismo; abonar abre la deuda (el abono real se
 * confirma allá); plan y presupuesto solo navegan.
 */
function ActionButton({ action }: { action: CopilotAction }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    switch (action.type) {
      case 'crear_gasto_fijo':
        setState('busy');
        try {
          await budgetApi.createFixed({ kind: 'gasto', name: action.name, amount: action.amount, dayOfMonth: action.dayOfMonth ?? undefined });
          setState('done');
        } catch (e) {
          setErr((e as Error).message);
          setState('error');
        }
        return;
      case 'abonar_deuda':
        navigation.navigate('Main', { screen: 'Debts', params: { screen: 'DebtDetail', params: { debtId: action.debtId, name: action.debtName } } });
        return;
      case 'ver_plan':
        navigation.navigate('CashflowPlan');
        return;
      case 'ver_presupuesto':
        navigation.navigate('Budget');
        return;
    }
  };

  if (state === 'done') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.primarySoft }}>
        <Ico name="checkmark-circle" color={colors.primary} />
        <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 13 }}>Hecho: {action.label.replace(/^Crear /, '')}</Text>
      </View>
    );
  }
  return (
    <View>
      <Pressable
        onPress={() => void run()}
        disabled={state === 'busy'}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
          paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.full,
          borderWidth: 1, borderColor: colors.primary,
          backgroundColor: pressed ? colors.primarySoft : colors.surface,
        })}
      >
        {state === 'busy' ? <ActivityIndicator size="small" color={colors.primary} /> : (
          <Ico name={action.type === 'crear_gasto_fijo' ? 'add-circle-outline' : action.type === 'abonar_deuda' ? 'cash-outline' : 'arrow-forward-circle-outline'} color={colors.primary} />
        )}
        <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 13 }}>
          {action.type === 'crear_gasto_fijo' ? `Confirmar: ${action.label}` : action.label}
        </Text>
      </Pressable>
      {state === 'error' && err ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{err}</Text> : null}
    </View>
  );
}
