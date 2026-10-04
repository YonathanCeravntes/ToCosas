import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService, Feature } from '../billing/entitlements.service';
import { SimulationsService } from '../simulations/simulations.service';
import { ScenarioParams } from '../simulations/simulation-engine';
import { LlmClient } from './llm.client';
import { ConsentService } from './consent.service';
import { ContextAssembler, toMinimizedSimulationView } from './context-assembler';
import { BrainViewsService, ProposedAction } from './brain-views.service';
import { brand } from './minimized-views';
import {
  detectIntent,
  parseSimulationIntent,
  renderSimulationResult,
  renderTemplate,
} from './templates';
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
  /** FIN-046: acciones PROPUESTAS por la IA; la app las muestra como botones a confirmar. */
  actions?: ProposedAction[];
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
    private readonly llm: LlmClient,
    private readonly simulations: SimulationsService,
    private readonly entitlements: EntitlementsService,
    private readonly brain: BrainViewsService,
  ) {}

  async sendMessage(userId: string, content: string, conversationId?: string): Promise<CopilotReply> {
    const conversation = await this.resolveConversation(userId, conversationId, content);
    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: 'user', content, source: 'template' },
    });

    const hasConsent = await this.consent.hasValidConsent(userId);
    const context = await this.assembler.buildInitialContext(userId);

    // FIN-046 (Fundador, 2026-09-29): con IA disponible, la IA responde TODO — las
    // plantillas quedan como respaldo (sin permiso, sin clave, circuito abierto o tope).
    const aiReady = hasConsent && this.llm.isConfigured() && !this.llm.circuitOpen();
    const usage = aiReady ? await this.dailyUsage(userId) : null;
    const useAi = aiReady && usage !== null && usage.used < usage.limit;

    // 1) Plantilla-primero (costo 0, disponible siempre) cuando no hay IA.
    // 1a) Simulaciones comunes por plantilla (FIN-007 §4.4: sin LLM).
    const simIntent = useAi ? null : parseSimulationIntent(content);
    if (simIntent) {
      try {
        const params: ScenarioParams | null =
          simIntent.intent === 'simular_abono'
            ? context.debts.length > 0
              ? {
                  type: 'abono_extra',
                  debtId: await this.simulations.resolveDebtRef(userId, this.worstDebtRef(context)),
                  extraMonthly: simIntent.extraMonthly,
                }
              : null
            : {
                type: 'nueva_deuda',
                amount: simIntent.amount,
                termMonths: simIntent.termMonths,
                ratePct: simIntent.ratePct ?? 20, // supuesto declarado en la respuesta
                rateBasis: 'EA',
              };
        if (params) {
          const result = await this.simulations.run(userId, params, 'copilot');
          let reply = renderSimulationResult(result);
          if (simIntent.intent === 'simular_deuda_nueva' && simIntent.ratePct === null) {
            reply += '\n(Supuse una tasa de 20% EA; dime la tasa real para afinar el cálculo.)';
          }
          return this.persistReply(userId, conversation.id, reply, 'template', hasConsent);
        }
      } catch (e) {
        this.logger.warn(`Simulación por plantilla falló: ${(e as Error).message}`);
      }
    }
    const intent = useAi ? null : detectIntent(content);
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
        ContextFieldGroup.Memory,
      ];
      await this.prisma.aiInteractionLog.create({
        data: { userId, conversationId: conversation.id, direction: 'request', purpose: 'chat', contextFieldGroups: groups },
      });
      const actions: ProposedAction[] = [];
      const result = await this.llm.chat(JSON.stringify(context), history, (tool, input) =>
        this.executeTool(userId, tool, input, actions),
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
      const reply = await this.persistReply(userId, conversation.id, result.text, 'llm', hasConsent);
      return { ...reply, actions: actions.slice(0, 3) };
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
  private async executeTool(userId: string, tool: string, input: Record<string, unknown>, actions: ProposedAction[] = []) {
    switch (tool) {
      case 'get_cashflow_plan': {
        const m = typeof input.monthly === 'number' && isFinite(input.monthly) && input.monthly >= 0 ? input.monthly : undefined;
        return this.brain.cashflowPlanView(userId, m);
      }
      case 'get_budget_now':
        return this.brain.budgetNowView(userId);
      case 'get_upcoming_payments':
        return this.brain.upcomingView(userId);
      case 'propose_action': {
        const action = actions.length < 3 ? await this.brain.toAction(userId, input) : null;
        if (action) actions.push(action);
        return brand({
          kind: 'action_proposed' as const,
          accepted: !!action,
          ...(action ? {} : { reason: 'acción inválida o demasiadas acciones' }),
        });
      }
      case 'get_financial_snapshot':
        return this.assembler.buildSnapshotView(userId);
      case 'get_debts':
        return this.assembler.buildDebtsView(userId);
      case 'get_score_breakdown':
        return this.assembler.buildScoreView(userId);
      case 'get_memory_and_insights':
        return this.assembler.buildMemoryView(userId);
      case 'run_simulation': {
        // FIN-007 §4.4: entrada tipada; refs "deuda #N" se resuelven en servidor.
        const params = await this.toScenarioParams(userId, input);
        const result = await this.simulations.run(userId, params, 'copilot');
        return toMinimizedSimulationView(result);
      }
      default:
        throw new ForbiddenException(`Tool desconocida: ${tool}`);
    }
  }

  private async toScenarioParams(
    userId: string,
    input: Record<string, unknown>,
  ): Promise<ScenarioParams> {
    const num = (k: string): number => {
      const v = input[k];
      if (typeof v !== 'number' || !isFinite(v)) {
        throw new BadRequestException(`Parámetro numérico inválido: ${k}`);
      }
      return v;
    };
    const debtId = async () =>
      this.simulations.resolveDebtRef(userId, String(input.debtRef ?? 'deuda #1'));

    switch (input.scenario) {
      case 'abono_extra':
        return { type: 'abono_extra', debtId: await debtId(), extraMonthly: num('extraMonthly') };
      case 'nueva_deuda':
        return {
          type: 'nueva_deuda',
          amount: num('amount'),
          termMonths: num('termMonths'),
          ratePct: num('ratePct'),
          rateBasis: 'EA',
        };
      case 'reducir_gastos':
        return { type: 'reducir_gastos', monthlyAmount: num('monthlyAmount') };
      case 'cambio_ingreso':
        return { type: 'cambio_ingreso', newMonthlyIncome: num('newMonthlyIncome') };
      case 'estrategia_deudas':
        return { type: 'estrategia_deudas', extraBudget: num('extraBudget') };
      case 'refinanciar':
        return {
          type: 'refinanciar',
          debtId: await debtId(),
          newRatePct: num('newRatePct'),
          newRateBasis: 'EA',
          newTermMonths: num('newTermMonths'),
        };
      default:
        throw new BadRequestException('Escenario de simulación desconocido');
    }
  }

  /** Ref de la deuda de mayor tasa (para el default del abono por plantilla). */
  private worstDebtRef(context: { debts: Array<{ ref: string; ratePct: number }> }): string {
    return [...context.debts].sort((a, b) => b.ratePct - a.ratePct)[0].ref;
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
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    const names = await this.brain.refNames(userId);
    return rows.map((m) => (m.role === 'assistant' ? { ...m, content: this.brain.applyNames(m.content, names) } : m));
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
    // FIN-046: se GUARDA con referencias (el historial vuelve a la IA sin nombres) y se
    // MUESTRA con los nombres reales de la persona.
    return { conversationId, reply: await this.brain.humanize(userId, reply), source, aiRemainingToday };
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
    // FIN-009: el límite lo decide EntitlementsService leyendo Subscription
    // (DEC-0009 §10.4), no la caché `plan`.
    const limit =
      (await this.entitlements.limit(userId, Feature.AiDailyMessages)) ?? AI_DAILY_LIMIT_PREMIUM;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const used = await this.prisma.aiInteractionLog.count({
      where: { userId, purpose: 'chat', direction: 'response', createdAt: { gte: dayStart } },
    });
    return { used, limit };
  }
}
