import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { ExpoPushSender } from './expo-push.sender';
import { PushSender } from './push-sender.interface';

@Module({
  imports: [AuthModule],
  controllers: [DevicesController],
  providers: [
    DevicesService,
    { provide: PushSender, useClass: ExpoPushSender },
  ],
  exports: [PushSender],
})
export class NotificationsModule {}
