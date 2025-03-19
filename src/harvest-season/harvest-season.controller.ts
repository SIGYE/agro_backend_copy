import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { HarvestSeasonService } from './harvest-season.service';
import { CreateHarvestSeasonDto } from './dto/create-harvest-season.dto';
import { UpdateHarvestSeasonDto } from './dto/update-harvest-season.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';

@Controller('harvest-season')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Harvest Season')
export class HarvestSeasonController {
  constructor(private readonly harvestSeasonService: HarvestSeasonService) { }

  @Post()
  async create(@Body() createHarvestSeasonDto: CreateHarvestSeasonDto) {
    try {
      return new ApiResponse(true, "Harvest Season Created", await this.harvestSeasonService.create(createHarvestSeasonDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Harvest Seasons", await this.harvestSeasonService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('current')
  async findCurrent() {
    try {
      const currentSeason = await this.harvestSeasonService.findCurrent();
      if (!currentSeason) {
        return new ApiResponse(false, "No current harvest season found", null, 404);
      }
      return new ApiResponse(true, "Current Harvest Season", currentSeason, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Harvest Season Retrieved", await this.harvestSeasonService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateHarvestSeasonDto: UpdateHarvestSeasonDto) {
    try {
      return new ApiResponse(true, "Harvest Season Updated", await this.harvestSeasonService.update(id, updateHarvestSeasonDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Harvest Season Deleted", await this.harvestSeasonService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}