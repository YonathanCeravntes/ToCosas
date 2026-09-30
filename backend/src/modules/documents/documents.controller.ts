import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, Res, UseGuards, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';

class ConsentDto {
  @ApiProperty({ description: 'También guardar facturas de salud (dato sensible, opt-in).' })
  @IsBoolean()
  health!: boolean;
}

class RevokeDto {
  @ApiPropertyOptional({ description: 'Borrar además todo lo guardado.' })
  @IsOptional()
  @IsBoolean()
  deleteAll?: boolean;
}

const thisYear = () => new Date().getUTCFullYear();

/** FIN-054 · Mis documentos. */
@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get('consent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  consent(@CurrentUser() user: AuthUser) {
    return this.docs.consentStatus(user.id);
  }

  @Post('consent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  grant(@CurrentUser() user: AuthUser, @Body() dto: ConsentDto) {
    return this.docs.grantConsent(user.id, dto.health);
  }

  @Post('consent/revoke')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  revoke(@CurrentUser() user: AuthUser, @Body() dto: RevokeDto) {
    return this.docs.revokeConsent(user.id, !!dto.deleteAll);
  }

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  summary(@CurrentUser() user: AuthUser, @Query('year', new DefaultValuePipe(thisYear()), ParseIntPipe) year: number) {
    return this.docs.summary(user.id, year);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Query('year', new DefaultValuePipe(thisYear()), ParseIntPipe) year: number,
    @Query('kind') kind?: string,
  ) {
    return this.docs.list(user.id, year, kind);
  }

  @Post('export-link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  exportLink(@CurrentUser() user: AuthUser, @Req() req: Request, @Query('year', new DefaultValuePipe(thisYear()), ParseIntPipe) year: number) {
    const base = `${req.protocol}://${req.get('host')}/v1`;
    return this.docs.exportLink(user.id, year, base.replace(/^http:\/\/(?!localhost|127\.)/, 'https://'));
  }

  /** Descarga del .zip con el enlace firmado (sin sesión: el navegador no manda el token). */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('export/:token')
  async export(@Param('token') token: string, @Res() res: Response) {
    const { userId, year } = this.docs.verifyExportToken(token);
    const zip = await this.docs.buildZip(userId, year);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="millo-documentos-${year}.zip"`);
    zip.pipe(res);
  }

  @Get(':id/download')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  download(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.docs.downloadUrl(user.id, id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.docs.remove(user.id, id);
  }
}
