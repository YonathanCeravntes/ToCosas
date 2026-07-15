import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { EntitiesService } from './entities.service';
import { CreateEntityDto, UpdateEntityDto } from './dto/entity.dto';

@ApiTags('entities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entities')
export class EntitiesController {
  constructor(private readonly entities: EntitiesService) {}

  // FIN-034: búsqueda/autocomplete del selector (relevancia + recencia + tipo).
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('type') type?: string,
  ) {
    return this.entities.search(user.id, q, type);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEntityDto) {
    return this.entities.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.entities.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.entities.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.entities.remove(user.id, id);
  }
}
