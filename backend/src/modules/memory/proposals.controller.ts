import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ProposalsService } from './proposals.service';

/** FIN-046 Fase 4 · Confirmar una propuesta de un toque ("Sí, hazlo"). */
@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Post(':insightId/accept')
  accept(@CurrentUser() user: AuthUser, @Param('insightId') insightId: string) {
    return this.proposals.accept(user.id, insightId);
  }
}
