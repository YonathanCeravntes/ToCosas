import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'tocosas-backend', time: new Date().toISOString() };
  }

  @Get('ready')
  ready() {
    // TODO: verificar conexión a Postgres y Redis cuando estén integrados.
    return { status: 'ready' };
  }
}
