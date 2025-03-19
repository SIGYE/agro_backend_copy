import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SeedStrainService } from './seed-strain.service';
import { CreateSeedStrainDto } from './dto/create-seed-strain.dto';
import { UpdateSeedStrainDto } from './dto/update-seed-strain.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';

@Controller('seed-strain')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Seed Strain')
export class SeedStrainController {
  constructor(private readonly seedStrainService: SeedStrainService) { }

  @Post()
  async create(@Body() createSeedStrainDto: CreateSeedStrainDto, @CurrentUser() user: User) {
    try {
      return new ApiResponse(true, "Seed Strain Created", await this.seedStrainService.create(user.id, createSeedStrainDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Seed Strains", await this.seedStrainService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crop-type/:cropTypeId')
  async findAllByCropType(@Param('cropTypeId') cropTypeId: string) {
    try {
      return new ApiResponse(true, "Seed Strains By Crop Type", await this.seedStrainService.findAllByCropType(cropTypeId), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Seed Strain Retrieved", await this.seedStrainService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSeedStrainDto: UpdateSeedStrainDto) {
    try {
      return new ApiResponse(true, "Seed Strain Updated", await this.seedStrainService.update(id, updateSeedStrainDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Seed Strain Deleted", await this.seedStrainService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}