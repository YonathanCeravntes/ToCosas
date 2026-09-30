import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() kind!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() icon?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
}

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('kind') kind?: string) {
    return this.categories.findAll(user.id, kind);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.categories.create(user.id, dto);
  }
}
