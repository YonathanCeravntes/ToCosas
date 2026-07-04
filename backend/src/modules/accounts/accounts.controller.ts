import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto, UpdateBalanceDto } from './dto/account.dto';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  // Patrimonio (on-read)
  @Get('net-worth')
  netWorth(@CurrentUser() user: AuthUser) {
    return this.accounts.netWorth(user.id);
  }

  // Cuentas
  @Post('accounts')
  createAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountDto) {
    return this.accounts.createAccount(user.id, dto);
  }

  @Get('accounts')
  listAccounts(@CurrentUser() user: AuthUser) {
    return this.accounts.findAccounts(user.id);
  }

  @Patch('accounts/:id')
  updateAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.updateAccount(user.id, id, dto);
  }

  @Patch('accounts/:id/balance')
  updateBalance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBalanceDto,
  ) {
    return this.accounts.updateBalance(user.id, id, dto.balance);
  }

  @Delete('accounts/:id')
  removeAccount(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accounts.removeAccount(user.id, id);
  }

  // Activos
  @Post('assets')
  createAsset(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDto) {
    return this.accounts.createAsset(user.id, dto);
  }

  @Get('assets')
  listAssets(@CurrentUser() user: AuthUser) {
    return this.accounts.findAssets(user.id);
  }

  @Patch('assets/:id')
  updateAsset(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.accounts.updateAsset(user.id, id, dto);
  }

  @Delete('assets/:id')
  removeAsset(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accounts.removeAsset(user.id, id);
  }
}
