import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordRecoveryService } from './password-recovery.service';
import { AccountService } from './account.service';
import { AccountPurgeScheduler } from './account-purge.scheduler';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, JwtAuthGuard, PasswordRecoveryService, AccountService, AccountPurgeScheduler],
  exports: [TokenService, JwtAuthGuard],
})
export class AuthModule {}
