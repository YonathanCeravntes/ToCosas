import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Injectable,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionService } from './subscription.service';
import { PromoService } from './promo.service';
import { CostReportService } from './cost-report.service';

/**
 * Guard administrativo (DEC-0009 §10.2): exige `User.isAdmin=true`, campo sin
 * ruta de auto-escalación (solo modificable por operación manual en BD).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // JwtAuthGuard adjunta `req.user = { id, email }` (ver jwt-auth.guard.ts).
    const req = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Solo administradores.');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) throw new ForbiddenException('Solo administradores.');
    return true;
  }
}

class RedeemDto {
  @ApiProperty({ example: 'MILLO-AB12CD34' })
  @IsString()
  @MaxLength(40)
  code!: string;
}

class FunnelDto {
  @ApiProperty({ enum: ['paywall_view', 'upgrade_intent'] })
  @IsIn(['paywall_view', 'upgrade_intent'])
  event!: string;

  @ApiPropertyOptional({ example: 'score_history' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}

class AdminActivateDto {
  @ApiProperty() @IsString() targetUserId!: string;
  @ApiProperty({ example: 30 }) @IsInt() @IsPositive() days!: number;
  @ApiProperty({ example: 'early adopter — acuerdo del fundador' }) @IsString() reason!: string;
}

class CreatePromoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) code?: string;
  @ApiPropertyOptional({ example: 30 }) @IsOptional() @IsInt() @IsPositive() durationDays?: number;
  @ApiProperty({ example: 50, description: 'OBLIGATORIO (DEC-0009 §10.6)' })
  @IsInt()
  @IsPositive()
  maxUses!: number;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger('MonetizationFunnel');

  constructor(
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionService,
    private readonly promo: PromoService,
    private readonly costReport: CostReportService,
  ) {}

  // --- Usuario ---

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser) {
    const [status, quota] = await Promise.all([
      this.subscriptions.statusFor(user.id),
      this.entitlements.simulationQuota(user.id),
    ]);
    return {
      ...status,
      simulationQuota: quota,
      // Placeholder (DEC-0009 §10.5): sin cobros reales hasta fijar precio con datos.
      priceCop: Number(this.config.get('MILLOPLUS_PRICE_COP', '0')) || null,
    };
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemDto) {
    const result = await this.promo.redeem(user.id, dto.code);
    this.logger.log(`[funnel] code_redeemed user=${user.id} days=${result.days}`);
    return { redeemed: true, days: result.days };
  }

  /** Funnel medible (§4.4): eventos como log estructurado, sin tabla nueva. */
  @Post('funnel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  funnel(@CurrentUser() user: AuthUser, @Body() dto: FunnelDto) {
    this.logger.log(`[funnel] ${dto.event} user=${user.id} source=${dto.source ?? '-'}`);
  }

  // --- Webhook RevenueCat (única pasarela real del ciclo, DEC-0009 §4.5) ---

  @Post('webhook/revenuecat')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async revenuecat(
    @Headers('authorization') auth: string,
    @Body() body: { event?: { type: string; app_user_id: string; expiration_at_ms?: number; id?: string } },
  ) {
    const secret = this.config.get<string>('REVENUECAT_WEBHOOK_SECRET', '');
    if (!secret || auth !== `Bearer ${secret}`) {
      throw new ForbiddenException('Firma de webhook inválida.');
    }
    if (body?.event?.app_user_id) {
      await this.subscriptions.syncFromRevenueCat(body.event);
    }
    return { received: true };
  }

  // --- Administración (AdminGuard, DEC-0009 §10.2) ---

  @Post('admin/activate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  adminActivate(@CurrentUser() admin: AuthUser, @Body() dto: AdminActivateDto) {
    return this.promo.adminActivate(admin.id, dto.targetUserId, dto.days, dto.reason);
  }

  @Post('admin/promo-codes')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  createPromo(@Body() dto: CreatePromoDto) {
    return this.promo.createCode(dto);
  }

  /** Telemetría de costo variable (DEC-0009 §10.5) para fijar el precio con datos. */
  @Get('admin/cost-report')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  costReportForMonth(@Query('month') month?: string) {
    return this.costReport.monthly(month);
  }
}
