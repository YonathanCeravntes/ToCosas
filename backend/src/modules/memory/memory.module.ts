import { Module } from '@nestjs/common';
import { FinancialEngineModule } from '../financial-engine/financial-engine.module';
import { MemoryService } from './memory.service';
import { MemoryJob } from './memory.job';

/** Memoria financiera estructurada (FIN-006 §4.4) — sin embeddings. */
@Module({
  imports: [FinancialEngineModule],
  providers: [MemoryService, MemoryJob],
  exports: [MemoryService],
})
export class MemoryModule {}
