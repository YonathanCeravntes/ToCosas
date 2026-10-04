import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentStorageService } from './storage.service';
import { DocumentIntakeService } from './document-intake.service';

/** FIN-054 · Mis documentos (bóveda de facturas, extractos y certificados). */
@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentStorageService, DocumentIntakeService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
