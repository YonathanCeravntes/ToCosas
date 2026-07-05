import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnthropicClient } from './anthropic.client';
import { ConsentService } from './consent.service';
import { ContextAssembler } from './context-assembler';
import { CopilotService } from './copilot.service';
import { CopilotController, CopilotProductionGuard } from './copilot.controller';
import { CopilotRetentionJob } from './copilot-retention.job';

/**
 * Capa 3 · Copiloto Financiero (FIN-005). Primera integración LLM del producto,
 * bajo DEC-0005 v2 + adenda legal: consentimiento opt-in, vistas minimizadas,
 * plantilla-primero, y datos reales bloqueados hasta DPA+PIA.
 */
@Module({
  imports: [AuthModule],
  controllers: [CopilotController],
  providers: [
    ConsentService,
    ContextAssembler,
    AnthropicClient,
    CopilotService,
    CopilotProductionGuard,
    CopilotRetentionJob,
  ],
})
export class CopilotModule {}
