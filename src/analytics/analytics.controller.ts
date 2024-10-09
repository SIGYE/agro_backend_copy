import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiQuery, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponse } from 'src/responses/api.response';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('/dashboard/agro-card-data')
  @ApiOperation({ summary: 'Get Agro Card Analytics' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getAgroCardAnalytics(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Agro Card Analytics", await this.analyticsService.getAgroCardAnalytics(locationId), null);
  }

  @Get('/dashboard/vet-card-data')
  @ApiOperation({ summary: 'Get Agro Card Analytics' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getVetCardAnalytics(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Veterinary Card Analytics", await this.analyticsService.getVetCardAnalytics(locationId), null);
  }

  @Get('/dashboard/agro-farmer-crops')
  @ApiOperation({ summary: 'Get Agro Farmer Crops' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getAgroFarmerCrops(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Agro Farmer Crops", await this.analyticsService.getAgroFarmerCrops(locationId), null);
  }

  @Get('/dashboard/vet-farmer-animals')
  @ApiOperation({ summary: 'Get Animals Kept by farmers' })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getVetFarmerAnimals(@Query('locationId') locationId?: number) {
    return new ApiResponse(true, "Vet Farmer Crops", await this.analyticsService.getVetFarmerAnimals(locationId), null);
  }
}
