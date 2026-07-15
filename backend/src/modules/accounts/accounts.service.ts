import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { computeNetWorth } from './networth.util';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  // ---------- Cuentas ----------

  async createAccount(userId: string, dto: CreateAccountDto) {
    const balance = dto.currentBalance ?? 0;
    const isLiquid = dto.isLiquid ?? true;
    const isEmergencyFund = dto.isEmergencyFund ?? false;
    this.assertBalanceSign(balance, isLiquid, isEmergencyFund);

    return this.outbox.withEvent(async (tx) => {
      const account = await tx.account.create({
        data: {
          userId,
          entityId: dto.entityId ?? null,
          name: dto.name,
          type: dto.type,
          currency: dto.currency ?? 'COP',
          currentBalance: balance,
          isLiquid,
          includeInNetWorth: dto.includeInNetWorth ?? true,
          isEmergencyFund,
        },
      });
      // Regla FIN-002: el saldo inicial deja rastro en el histórico.
      await tx.accountBalanceEntry.create({
        data: { accountId: account.id, balance, source: 'manual' },
      });
      return {
        result: account,
        event: {
          aggregateType: 'account',
          aggregateId: account.id,
          eventType: DomainEventType.AccountCreated,
          payload: { userId, balance },
        },
      };
    });
  }

  findAccounts(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAccount(userId: string, id: string, dto: UpdateAccountDto) {
    await this.ownAccount(userId, id);
    // El saldo NO se cambia aquí; se usa el endpoint dedicado updateBalance.
    const { currentBalance, ...meta } = dto;
    void currentBalance;
    return this.prisma.account.update({ where: { id }, data: { ...meta } });
  }

  /** Actualiza el saldo: valida, persiste, deja histórico y emite evento (misma tx). */
  async updateBalance(userId: string, id: string, balance: number) {
    const account = await this.ownAccount(userId, id);
    this.assertBalanceSign(balance, account.isLiquid, account.isEmergencyFund);

    return this.outbox.withEvent(async (tx) => {
      const updated = await tx.account.update({
        where: { id },
        data: { currentBalance: balance },
      });
      await tx.accountBalanceEntry.create({
        data: { accountId: id, balance, source: 'manual' },
      });
      return {
        result: updated,
        event: {
          aggregateType: 'account',
          aggregateId: id,
          eventType: DomainEventType.AccountBalanceUpdated,
          payload: { userId, balance },
        },
      };
    });
  }

  async removeAccount(userId: string, id: string) {
    await this.ownAccount(userId, id);
    return this.outbox.withEvent(async (tx) => {
      await tx.account.update({ where: { id }, data: { deletedAt: new Date() } });
      return {
        result: { deleted: true },
        event: {
          aggregateType: 'account',
          aggregateId: id,
          eventType: DomainEventType.AccountDeleted,
          payload: { userId },
        },
      };
    });
  }

  // ---------- Activos ----------

  async createAsset(userId: string, dto: CreateAssetDto) {
    return this.outbox.withEvent(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          currency: dto.currency ?? 'COP',
          currentValue: dto.currentValue,
          acquisitionValue: dto.acquisitionValue ?? null,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
          isLiquid: dto.isLiquid ?? false,
          includeInNetWorth: dto.includeInNetWorth ?? true,
          notes: dto.notes ?? null,
        },
      });
      return {
        result: asset,
        event: {
          aggregateType: 'asset',
          aggregateId: asset.id,
          eventType: DomainEventType.AssetChanged,
          payload: { userId, op: 'create' },
        },
      };
    });
  }

  findAssets(userId: string) {
    return this.prisma.asset.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAsset(userId: string, id: string, dto: UpdateAssetDto) {
    await this.ownAsset(userId, id);
    return this.outbox.withEvent(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...dto,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        },
      });
      return {
        result: asset,
        event: {
          aggregateType: 'asset',
          aggregateId: id,
          eventType: DomainEventType.AssetChanged,
          payload: { userId, op: 'update' },
        },
      };
    });
  }

  async removeAsset(userId: string, id: string) {
    await this.ownAsset(userId, id);
    return this.outbox.withEvent(async (tx) => {
      await tx.asset.update({ where: { id }, data: { deletedAt: new Date() } });
      return {
        result: { deleted: true },
        event: {
          aggregateType: 'asset',
          aggregateId: id,
          eventType: DomainEventType.AssetChanged,
          payload: { userId, op: 'delete' },
        },
      };
    });
  }

  // ---------- Patrimonio (on-read) ----------

  async netWorth(userId: string) {
    const [accounts, assets, debts] = await Promise.all([
      this.prisma.account.findMany({ where: { userId, deletedAt: null, archivedAt: null } }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa' } }),
    ]);

    const liabilities = debts.reduce((a, d) => a + Number(d.currentBalance), 0);
    const summary = computeNetWorth(
      accounts.map((a) => ({
        currentBalance: Number(a.currentBalance),
        isLiquid: a.isLiquid,
        includeInNetWorth: a.includeInNetWorth,
        isEmergencyFund: a.isEmergencyFund,
      })),
      assets.map((a) => ({
        currentValue: Number(a.currentValue),
        includeInNetWorth: a.includeInNetWorth,
      })),
      liabilities,
    );

    return {
      ...summary,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentBalance: Number(a.currentBalance),
        isLiquid: a.isLiquid,
        isEmergencyFund: a.isEmergencyFund,
      })),
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentValue: Number(a.currentValue),
      })),
      liabilities: debts.map((d) => ({
        id: d.id,
        name: d.name,
        currentBalance: Number(d.currentBalance),
      })),
    };
  }

  // ---------- Helpers ----------

  private assertBalanceSign(balance: number, isLiquid: boolean, isEmergencyFund: boolean) {
    // DEC-0002 §10.4: no se permiten saldos negativos en cuentas líquidas o de
    // fondo de emergencia. Otros tipos pueden aceptarlo (sobregiro).
    if (balance < 0 && (isLiquid || isEmergencyFund)) {
      throw new BadRequestException(
        'Una cuenta líquida o de fondo de emergencia no puede tener saldo negativo.',
      );
    }
  }

  private async ownAccount(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  private async ownAsset(userId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    return asset;
  }
}
