import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiQuery, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApiResponse } from 'src/responses/api.response';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('/dashboard/agro-card-data')
  @ApiOperation({ summary: 'Get Agro Card Analytics' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getAgroCardAnalytics(@Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.getAgroCardAnalytics(locationId);
      return new ApiResponse(true, "Agro Card Analytics", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/vet-card-data')
  @ApiOperation({ summary: 'Get Agro Card Analytics' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getVetCardAnalytics(@Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.getVetCardAnalytics(locationId);
      return new ApiResponse(true, "Veterinary Card Analytics", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/vet-farmer-animals')
  @ApiOperation({ summary: 'Get Animals Kept by farmers' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getVetFarmerAnimals(@Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.getVetFarmerAnimals(locationId);
      return new ApiResponse(true, "Vet Farmer Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/crop-harvest')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getCropHarvest(@Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.cropHarvestAnalytics(locationId);
      return new ApiResponse(true, "Crop Harvest", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/crop-harvest-by-year-and-location/:locationId')
  @ApiParam({ name: 'locationId', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getCropHarvestByYearAndLocation(@Param('locationId') locationId: number, @Query('year') year: number) {
    try {
      const data = await this.analyticsService.getHarvestByYearAndLocation(locationId, year);
      return new ApiResponse(true, "Crop Harvest", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/animal-production-by-year-and-location/:locationId')
  @ApiParam({ name: 'locationId', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getAnimalProductionByYearAndLocation(@Param('locationId') locationId: number, @Query('year') year: number) {
    try {
      const data = await this.analyticsService.getProduceByYearAndLocation(locationId, year);
      return new ApiResponse(true, "Animal Production", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/farmer-age-range/:locationId')
  @ApiParam({ name: 'locationId', required: false, type: Number })
  async getFarmerAgeRange(@Param('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.getFarmerAgeRangeByLocation(locationId);
      return new ApiResponse(true, "Farmer Age Range", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/top-crops/:locationId/limit/:limit')
  @ApiParam({ name: 'locationId', required: false, type: Number })
  @ApiParam({ name: 'limit', required: false, type: Number })
  async getTopCrops(@Param('locationId') locationId?: number, @Param('limit') limit?: number) {
    try {
      const data = await this.analyticsService.getTopCropFarmerRegistrations(locationId, limit);
      return new ApiResponse(true, "Top Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}