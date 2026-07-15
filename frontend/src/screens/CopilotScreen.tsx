import React, { useEffect, useRef, useState } from 'react';
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
import { Button, Card, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { AiConsentStatus, CopilotMessage, Insight, InsightSeverity, Recommendation } from '../api/types';
import { copilotApi, insightsApi, recommendationsApi } from '../api/endpoints';

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  critical: colors.danger,
  warning: colors.warning,
  info: colors.success,
};

const STARTERS = [
  '¿Por qué está así mi Score?',
  'Resumen de mi mes',
  '¿Qué deuda pago primero?',
  '¿Qué es el DTI?',
];

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'template' | 'llm';
}

export function CopilotScreen() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [consent, setConsent] = useState<AiConsentStatus | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const listRef = useRef<FlatList<ChatItem>>(null);

  useEffect(() => {
    void copilotApi.consentStatus().then(setConsent).catch(() => undefined);
    void insightsApi.list().then(setInsights).catch(() => undefined);
    void recommendationsApi.list().then(setRecommendations).catch(() => undefined);
  }, []);

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
        { id: `a-${Date.now()}`, role: 'assistant', content: res.reply, source: res.source },
      ]);
    } catch (e) {
      setItems((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: `⚠️ ${(e as Error).message}`, source: 'template' },
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
      <View style={{ backgroundColor: consent?.accepted ? '#EAF7F1' : colors.surface, padding: spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          {consent?.accepted
            ? `🤖 IA activa${aiRemaining !== null ? ` · ${aiRemaining} mensajes IA hoy` : ''}`
            : '⚡ Modo básico (respuestas instantáneas). Activa la IA para preguntas abiertas.'}
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
            {/* Recomendado para ti (FIN-007): acciones con beneficio cuantificado */}
            {recommendations.length > 0 ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  ✨ Recomendado para ti
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
                  🔔 Novedades
                </Text>
                {insights.slice(0, 4).map((ins) => (
                  <Pressable key={ins.id} onPress={() => openInsight(ins)}>
                    <Card style={{ borderLeftWidth: 4, borderLeftColor: SEVERITY_COLOR[ins.severity], paddingVertical: spacing.sm }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={2}>
                          {ins.title}
                        </Text>
                        <Pressable onPress={() => void dismissInsight(ins.id)} style={{ paddingLeft: spacing.sm }}>
                          <Text style={{ color: colors.textMuted }}>✕</Text>
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
                👋 Soy tu Copiloto Financiero
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
          {sending ? <ActivityIndicator color={colors.textInverse} /> : <Text style={{ color: colors.textInverse, fontSize: 18 }}>➤</Text>}
        </Pressable>
      </View>

      <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.md, paddingBottom: 6, backgroundColor: colors.surface }}>
        Información educativa; no es asesoría financiera regulada.
      </Text>

      {/* Modal de consentimiento (DEC-0005 §14.1) */}
      <Modal visible={showConsent} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '85%', padding: spacing.md }}>
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
            <Text style={{ color: colors.textMuted }}>✕</Text>
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
                <Button title="✓ Lo hice" variant="secondary" onPress={onDone} />
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
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        backgroundColor: isUser ? colors.primary : colors.surface,
        borderRadius: radius.md,
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.border,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        maxWidth: '85%',
      }}
    >
      <Text style={{ color: isUser ? colors.textInverse : colors.text, lineHeight: 20 }}>
        {item.content}
      </Text>
      {!isUser && item.source ? (
        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
          {item.source === 'llm' ? '🤖 IA' : '⚡ instantánea'}
        </Text>
      ) : null}
    </View>
  );
}
