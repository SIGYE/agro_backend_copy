import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FarmingActivityService } from './farming-activity.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { CreateFarmingActivityDto } from './dto/create-farming-activity.dto';
import { UpdateFarmingActivityDto } from './dto/update-farming-activity.dto';

@Controller('farming-activity')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Farming Activity')
export class FarmingActivityController {
  constructor(private readonly farmingActivityService: FarmingActivityService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new farming activity with optional medicines, vaccines, fertilizers and metrics' })
  async create(@Body() createFarmingActivityDto: CreateFarmingActivityDto) {
    try {
      return new ApiResponse(
        true,
        "Farming Activity Created",
        await this.farmingActivityService.create(createFarmingActivityDto),
        201
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all farming activities with related entities' })
  async findAll() {
    try {
      return new ApiResponse(
        true,
        "All Farming Activities",
        await this.farmingActivityService.findAll(),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('season/:seasonId')
  @ApiOperation({ summary: 'Get all farming activities for a specific season' })
  @ApiParam({ name: 'seasonId', description: 'ID of the season' })
  async findAllBySeason(@Param('seasonId') seasonId: string) {
    try {
      return new ApiResponse(
        true,
        "Farming Activities By Season",
        await this.farmingActivityService.findAllBySeason(seasonId),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'cropId', required: false, type: String })
  @ApiQuery({ name: 'harvestSeasonId', required: false, type: String })
  @ApiQuery({ name: 'farmerId', required: false, type: String })
  @ApiQuery({ name: 'cooperativeId', required: false, type: String })
  @Get('get-activities-by-season-crop')
  async getFarmingActivitiesByCropAndHarvestSeason(@Query('cropId') cropId: string, @Query('harvestSeasonId') harvestSeasonId: string, @Query('locationId') locationId?: number, @Query('farmerId') farmerId?: string, @Query('cooperativeId') cooperativeId?: string) {
    try {
      const data = await this.farmingActivityService.getFarmingActivitiesByCropAndHarvestSeason(cropId, harvestSeasonId, locationId, farmerId, cooperativeId);
      return new ApiResponse(true, "Farming activities by season and crop", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific farming activity by ID' })
  @ApiParam({ name: 'id', description: 'ID of the farming activity' })
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "Farming Activity Retrieved",
        await this.farmingActivityService.findOne(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a farming activity with optional medicines, vaccines, fertilizers and metrics' })
  @ApiParam({ name: 'id', description: 'ID of the farming activity to update' })
  async update(@Param('id') id: string, @Body() updateFarmingActivityDto: CreateFarmingActivityDto) {
    try {
      return new ApiResponse(
        true,
        "Farming Activity Updated",
        await this.farmingActivityService.update(id, updateFarmingActivityDto),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a farming activity' })
  @ApiParam({ name: 'id', description: 'ID of the farming activity to delete' })
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "Farming Activity Deleted",
        await this.farmingActivityService.remove(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

}