import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnthropicClient } from './anthropic.client';
import { ConsentService } from './consent.service';
import { ContextAssembler } from './context-assembler';
import { detectIntent, renderTemplate } from './templates';
import {
  AI_DAILY_LIMIT_FREE,
  AI_DAILY_LIMIT_PREMIUM,
  ContextFieldGroup,
  LLM_HISTORY_LIMIT,
} from './copilot.constants';

export interface CopilotReply {
  conversationId: string;
  reply: string;
  source: 'template' | 'llm';
  aiRemainingToday: number | null; // null = sin consentimiento/IA no disponible
}

/**
 * Orquestador del Copiloto (FIN-005 §4.1):
 * consentimiento → plantilla-primero → LLM (si aporta y está permitido) →
 * persistencia + log auditable. El modo plantillas es la base funcional, no un
 * fallback de emergencia.
 */
@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consent: ConsentService,
    private readonly assembler: ContextAssembler,
    private readonly llm: AnthropicClient,
  ) {}

  async sendMessage(userId: string, content: string, conversationId?: string): Promise<CopilotReply> {
    const conversation = await this.resolveConversation(userId, conversationId, content);
    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: 'user', content, source: 'template' },
    });

    const hasConsent = await this.consent.hasValidConsent(userId);
    const context = await this.assembler.buildInitialContext(userId);

    // 1) Plantilla-primero (costo 0, disponible siempre).
    const intent = detectIntent(content);
    if (intent) {
      const reply = renderTemplate(intent, context, content);
      return this.persistReply(userId, conversation.id, reply, 'template', hasConsent);
    }

    // 2) Sin consentimiento, sin API key o circuito abierto → plantilla de ayuda.
    if (!hasConsent || !this.llm.isConfigured() || this.llm.circuitOpen()) {
      const reply = renderTemplate('help', context, content);
      return this.persistReply(userId, conversation.id, reply, 'template', hasConsent);
    }

    // 3) Límite diario por plan (señal de monetización, DEC-0001 §10.8).
    const { used, limit } = await this.dailyUsage(userId);
    if (used >= limit) {
      await this.prisma.aiInteractionLog.create({
        data: { userId, conversationId: conversation.id, direction: 'request', purpose: 'premium_intent', contextFieldGroups: [] },
      });
      const reply =
        `Alcanzaste tus ${limit} mensajes con IA de hoy. Sigo disponible en modo básico ` +
        `(escribe "ayuda" para ver qué puedo responder al instante). Con Millo+ tendrás muchos más mensajes diarios.`;
      return this.persistReply(userId, conversation.id, reply, 'template', hasConsent);
    }

    // 4) LLM con contexto minimizado + tools restringidas a vistas (§4.3-A).
    try {
      const history = await this.recentHistory(conversation.id);
      const groups = [
        ContextFieldGroup.Score,
        ContextFieldGroup.Metrics,
        ContextFieldGroup.Debts,
        ContextFieldGroup.Budget,
        ContextFieldGroup.NetWorth,
        ContextFieldGroup.CategorySpend,
      ];
      await this.prisma.aiInteractionLog.create({
        data: { userId, conversationId: conversation.id, direction: 'request', purpose: 'chat', contextFieldGroups: groups },
      });
      const result = await this.llm.chat(JSON.stringify(context), history, (tool) =>
        this.executeTool(userId, tool),
      );
      await this.prisma.aiInteractionLog.create({
        data: {
          userId,
          conversationId: conversation.id,
          direction: 'response',
          model: result.model,
          purpose: 'chat',
          contextFieldGroups: groups,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      });
      return this.persistReply(userId, conversation.id, result.text, 'llm', hasConsent);
    } catch (e) {
      // §4.8: fallo definitivo → plantilla con nota amable + log del error.
      this.logger.warn(`LLM falló, fallback a plantilla: ${(e as Error).message}`);
      await this.prisma.aiInteractionLog.create({
        data: { userId, conversationId: conversation.id, direction: 'response', purpose: 'llm_error', contextFieldGroups: [] },
      });
      const reply =
        'Ahora mismo no puedo usar la IA, así que te respondo en modo básico. ' +
        renderTemplate('help', context, content);
      return this.persistReply(userId, conversation.id, reply, 'template', hasConsent);
    }
  }

  /** Ejecutor de tools: mapea nombre → vista minimizada (única vía, §4.3-A). */
  private executeTool(userId: string, tool: string) {
    switch (tool) {
      case 'get_financial_snapshot':
        return this.assembler.buildSnapshotView(userId);
      case 'get_debts':
        return this.assembler.buildDebtsView(userId);
      case 'get_score_breakdown':
        return this.assembler.buildScoreView(userId);
      default:
        throw new ForbiddenException(`Tool desconocida: ${tool}`);
    }
  }

  async listConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
  }

  async messages(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Borrado autónomo del historial (§4.7) — independiente del consentimiento. */
  async deleteHistory(userId: string) {
    const { count } = await this.prisma.conversation.deleteMany({ where: { userId } });
    return { deletedConversations: count };
  }

  // --- helpers ---

  private async resolveConversation(userId: string, conversationId: string | undefined, firstMessage: string) {
    if (conversationId) {
      const conv = await this.prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conv) throw new NotFoundException('Conversación no encontrada');
      await this.prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
      return conv;
    }
    return this.prisma.conversation.create({
      data: { userId, title: firstMessage.slice(0, 60) },
    });
  }

  private async persistReply(
    userId: string,
    conversationId: string,
    reply: string,
    source: 'template' | 'llm',
    hasConsent: boolean,
  ): Promise<CopilotReply> {
    await this.prisma.message.create({
      data: { conversationId, role: 'assistant', content: reply, source },
    });
    let aiRemainingToday: number | null = null;
    if (hasConsent && this.llm.isConfigured()) {
      const { used, limit } = await this.dailyUsage(userId);
      aiRemainingToday = Math.max(0, limit - used);
    }
    return { conversationId, reply, source, aiRemainingToday };
  }

  /** Últimos N mensajes de la conversación para el LLM (historial acotado). */
  private async recentHistory(conversationId: string) {
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: LLM_HISTORY_LIMIT,
    });
    return rows.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  private async dailyUsage(userId: string): Promise<{ used: number; limit: number }> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const limit = settings?.plan === 'premium' ? AI_DAILY_LIMIT_PREMIUM : AI_DAILY_LIMIT_FREE;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const used = await this.prisma.aiInteractionLog.count({
      where: { userId, purpose: 'chat', direction: 'response', createdAt: { gte: dayStart } },
    });
    return { used, limit };
  }
}
