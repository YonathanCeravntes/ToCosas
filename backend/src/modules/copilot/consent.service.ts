import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_CONSENT_TEXT, AI_CONSENT_VERSION } from './copilot.constants';

/**
 * Consentimiento de IA (FIN-005 §4.2 + DEC-0005 §14.1): opt-in versionado y
 * revocable. Sin consentimiento vigente, NINGÚN dato sale hacia el LLM.
 */
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  /** ¿Tiene consentimiento vigente (aceptado y en la versión actual)? */
  async hasValidConsent(userId: string): Promise<boolean> {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return !!s?.aiConsentAt && s.aiConsentVersion === AI_CONSENT_VERSION;
  }

  /** Estado para la UI: texto vigente, versión y si requiere (re)aceptación. */
  async status(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    const accepted = !!s?.aiConsentAt && s.aiConsentVersion === AI_CONSENT_VERSION;
    return {
      accepted,
      acceptedAt: accepted ? s?.aiConsentAt : null,
      currentVersion: AI_CONSENT_VERSION,
      consentText: AI_CONSENT_TEXT,
    };
  }

  async grant(userId: string) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, aiConsentAt: new Date(), aiConsentVersion: AI_CONSENT_VERSION },
      update: { aiConsentAt: new Date(), aiConsentVersion: AI_CONSENT_VERSION },
    });
    await this.log(userId, 'consent_granted');
    return { accepted: true, version: AI_CONSENT_VERSION };
  }

  /**
   * Revocación (§4.7): cesa el envío al LLM de inmediato. El historial de chat
   * SE CONSERVA (decisión ratificada); el borrado es un derecho autónomo aparte.
   */
  async revoke(userId: string) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, aiConsentAt: null, aiConsentVersion: null },
      update: { aiConsentAt: null, aiConsentVersion: null },
    });
    await this.log(userId, 'consent_revoked');
    return { accepted: false };
  }

  private log(userId: string, purpose: 'consent_granted' | 'consent_revoked') {
    return this.prisma.aiInteractionLog.create({
      data: { userId, direction: 'request', purpose, contextFieldGroups: [] },
    });
  }
}
