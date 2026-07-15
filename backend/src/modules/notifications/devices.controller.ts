import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user.id, dto);
  }

  @Delete()
  unregister(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.unregister(user.id, dto.pushToken);
  }
}
