import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { SpendClassService } from '../budget/spend-class.service';
import { ConsumptionService } from './consumption.service';
import { UpdateSpendClassDto } from './dto/spending.dto';

/** FIN-061 Fase 2.2–2.3 · Esencial y gustos, y el análisis de consumo del mes. */
@ApiTags('spending')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spending')
export class SpendingController {
  constructor(
    private readonly classes: SpendClassService,
    private readonly consumption: ConsumptionService,
  ) {}

  @Get('classes')
  listClasses(@CurrentUser() user: AuthUser) {
    return this.classes.list(user.id);
  }

  @Patch('classes/:categoryId')
  updateClass(
    @CurrentUser() user: AuthUser,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateSpendClassDto,
  ) {
    return this.classes.update(user.id, categoryId, dto);
  }

  @Get('consumption')
  analysis(@CurrentUser() user: AuthUser) {
    return this.consumption.forUser(user.id);
  }
}
