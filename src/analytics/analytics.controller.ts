import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiQuery, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApiResponse } from 'src/responses/api.response';
import { AuthGuard } from 'src/guards/auth.guard';
import { PaginationQueryDto } from 'src/pagination/pagination.dto';

@Controller('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }
  @Get('/dashboard/admin-card-data')
  @ApiOperation({ summary: 'Get admin Card Analytics' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getAdminCardAnalytics(@Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.adminCards(locationId);
      return new ApiResponse(true, "Admin Card Analytics", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

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
  async getCropHarvest(@Query() queryDto: PaginationQueryDto, @Query('locationId') locationId?: number, @Query('cooperativeId') cooperativeId?: string) {
    try {
      const data = await this.analyticsService.cropHarvestAnalytics(queryDto, locationId, cooperativeId);
      return new ApiResponse(true, "Crop Harvest", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/crop-harvest-by-year-and-location')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getCropHarvestByYearAndLocation(@Query('locationId') locationId: number, @Query('year') year: number) {
    try {
      const data = await this.analyticsService.getHarvestByYearAndLocation(year, locationId);
      return new ApiResponse(true, "Crop Harvest", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/animal-production-by-year-and-location')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getAnimalProductionByYearAndLocation(@Query('locationId') locationId: number, @Query('year') year: number) {
    try {
      const data = await this.analyticsService.getProduceByYearAndLocation(year, locationId);
      return new ApiResponse(true, "Animal Production", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/farmer-age-range')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getFarmerAgeRange(@Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.getFarmerAgeRangeByLocation(locationId);
      return new ApiResponse(true, "Farmer Age Range", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/dashboard/top-crops')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopCrops(@Query('limit') limit?: number, @Query('locationId') locationId?: number) {
    try {
      const data = await this.analyticsService.getTopCropFarmerRegistrations(limit, locationId);
      return new ApiResponse(true, "Top Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('buyer-data')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'cooperativeId', required: false, type: String })
  @ApiQuery({ name: 'viewType', required: true, type: String })
  async getBuyerData(@Query('locationId') locationId?: number, @Query('cooperativeId') cooperativeId?: string, @Query('viewType') viewType: 'cooperative' | 'farmer' = 'cooperative') {

    try {
      const data = await this.analyticsService.getCooperativeFarmerStatistics(locationId, cooperativeId, viewType);
      return new ApiResponse(true, "Buyer Data", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('dashboard/crop-land-relation')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'harvestSeason', required: false, type: String })
  async cropLandDistributionRelation(@Query('locationId') locationId?: number, @Query('harvestSeasonId') harvestSeasonId?: string, @Query('limit') limit?: number) {
    try {
      const data = await this.analyticsService.cropLandDistributionRelation(locationId, harvestSeasonId, limit);
      return new ApiResponse(true, "Crop Land relation", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('dashboard/crop-farmer-relation')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async cropFarmerRelation(@Query('locationId') locationId?: number, @Query('limit') limit?: number) {
    try {
      const data = await this.analyticsService.farmerCropsRelation(locationId, limit);
      return new ApiResponse(true, "Crop Land relation", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}


