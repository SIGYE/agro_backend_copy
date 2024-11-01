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
    return new ApiResponse(true, "Agro Card Analytics", await this.analyticsService.getAgroCardAnalytics(locationId), 200);
  }

  @Get('/dashboard/vet-card-data')
  @ApiOperation({ summary: 'Get Agro Card Analytics' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getVetCardAnalytics(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Veterinary Card Analytics", await this.analyticsService.getVetCardAnalytics(locationId), 200);
  }

  @Get('/dashboard/agro-farmer-crops')
  @ApiOperation({ summary: 'Get Agro Farmer Crops' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getAgroFarmerCrops(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Agro Farmer Crops", await this.analyticsService.getAgroFarmerCrops(locationId), 200);
  }

  @Get('/dashboard/vet-farmer-animals')
  @ApiOperation({ summary: 'Get Animals Kept by farmers' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getVetFarmerAnimals(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Vet Farmer Crops", await this.analyticsService.getVetFarmerAnimals(locationId), 200);
  }
  @Get('/dashboard/crop-harvest')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getCropHarvest(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Crop Harvest", await this.analyticsService.cropHarvestAnalytics(locationId), 200);
  }
  @Get('/dashboard/crop-harvest-by-year-and-location/:locationId')
  @ApiParam({ name: 'locationId', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getCropHarvestByYearAndLocation(@Param('locationId') locationId: number, @Query('year') year: number) {
    return new ApiResponse(true, "Crop Harvest", await this.analyticsService.getHarvestByYearAndLocation(locationId, year), 200);
  }
  @Get('/dashboard/animal-production-by-year-and-location/:locationId')
  @ApiParam({ name: 'locationId', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getAnimalProductionByYearAndLocation(@Param('locationId') locationId: number, @Query('year') year: number) {
    return new ApiResponse(true, "Animal Production", await this.analyticsService.getProduceByYearAndLocation(locationId, year), 200);
  }



}
