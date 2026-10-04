import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, Length, MaxLength, Min, ValidateIf } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { HouseholdService } from './household.service';

class ConsentDto {
  @ApiProperty({ description: 'La persona aceptó cómo se comparten los datos (Ley 1581).' })
  @IsBoolean()
  consent!: boolean;
}

class JoinDto extends ConsentDto {
  @ApiProperty({ example: 'K7M2QX' })
  @IsString()
  @Length(4, 12)
  code!: string;
}

class MeDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareIncome?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareDebts?: boolean;
}

enum SplitDto {
  proporcional = 'proporcional',
  mitad = 'mitad',
}

class HouseholdDto {
  @ApiPropertyOptional({ enum: SplitDto }) @IsOptional() @IsEnum(SplitDto) splitMode?: SplitDto;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsNumber() @Min(0) monthlyBudget?: number | null;
}

class GoalDto {
  @ApiProperty() @IsString() @MaxLength(60) name!: string;
  @ApiProperty() @IsNumber() @IsPositive() targetAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() targetDate?: string;
}

class ContributeDto {
  @ApiProperty() @IsNumber() @IsPositive() amount!: number;
}

class DebtShareDto {
  @ApiProperty() @IsBoolean() shared!: boolean;
}

/** FIN-059 · Millo en pareja. */
@ApiTags('household')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('household')
export class HouseholdController {
  constructor(private readonly household: HouseholdService) {}

  @Get()
  state(@CurrentUser() user: AuthUser) {
    return this.household.state(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ConsentDto) {
    return this.household.create(user.id, dto.consent);
  }

  @Post('invite')
  invite(@CurrentUser() user: AuthUser) {
    return this.household.newInvite(user.id);
  }

  // Un código de 6 caracteres no se adivina con 10 intentos por minuto.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('join')
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinDto) {
    return this.household.join(user.id, dto.code, dto.consent);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: MeDto) {
    return this.household.updateMe(user.id, dto);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: HouseholdDto) {
    return this.household.updateHousehold(user.id, dto);
  }

  @Post('leave')
  leave(@CurrentUser() user: AuthUser) {
    return this.household.leave(user.id);
  }

  @Get('month')
  month(@CurrentUser() user: AuthUser) {
    return this.household.month(user.id);
  }

  @Post('goals')
  createGoal(@CurrentUser() user: AuthUser, @Body() dto: GoalDto) {
    return this.household.createGoal(user.id, dto);
  }

  @Post('goals/:id/contribute')
  contribute(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ContributeDto) {
    return this.household.contribute(user.id, id, dto.amount);
  }

  @Delete('goals/:id')
  removeGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.household.removeGoal(user.id, id);
  }

  @Patch('debts/:id')
  shareDebt(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DebtShareDto) {
    return this.household.setDebtShared(user.id, id, dto.shared);
  }
}
