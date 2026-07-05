import {
  Body,
  CanActivate,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { CopilotService } from './copilot.service';
import { ConsentService } from './consent.service';

/** Gate técnico de producción (mismo patrón aprobado en DEC-0004 §10.3). */
@Injectable()
export class CopilotProductionGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(): boolean {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const enabled =
      this.config.get<string>('COPILOT_PRODUCTION_ENABLED', 'false') === 'true';
    if (isProduction && !enabled) {
      throw new ServiceUnavailableException(
        'El Copiloto no está habilitado en producción (pendiente revisión legal final).',
      );
    }
    return true;
  }
}

class SendMessageDto {
  @ApiProperty({ example: '¿Por qué está así mi score?' })
  @IsString()
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;
}

@ApiTags('copilot')
@ApiBearerAuth()
@UseGuards(CopilotProductionGuard, JwtAuthGuard)
@Controller('copilot')
export class CopilotController {
  constructor(
    private readonly copilot: CopilotService,
    private readonly consent: ConsentService,
  ) {}

  @Post('messages')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.copilot.sendMessage(user.id, dto.content, dto.conversationId);
  }

  @Get('conversations')
  conversations(@CurrentUser() user: AuthUser) {
    return this.copilot.listConversations(user.id);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.copilot.messages(user.id, id);
  }

  /** Borrado autónomo del historial (§4.7). */
  @Delete('history')
  deleteHistory(@CurrentUser() user: AuthUser) {
    return this.copilot.deleteHistory(user.id);
  }

  // --- Consentimiento de IA (§4.2 / DEC-0005 §14.1) ---

  @Get('consent')
  consentStatus(@CurrentUser() user: AuthUser) {
    return this.consent.status(user.id);
  }

  @Post('consent')
  grantConsent(@CurrentUser() user: AuthUser) {
    return this.consent.grant(user.id);
  }

  @Delete('consent')
  revokeConsent(@CurrentUser() user: AuthUser) {
    return this.consent.revoke(user.id);
  }
}
