import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiResponse } from 'src/responses/api.response';
import { HarvestReportQueryDto } from 'src/pagination/HarvestReportQuery.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ProduceReportQueryDto } from 'src/pagination/ProduceReportQuery.dto';
import { ProduceQueryDto } from './dto/ProduceReportQueryDto';
import { HarvestQueryDto } from './dto/HarvestReportQueryDto';

@Controller('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }


  @Get('crop-harvest')
  async getHarvestReport(@Query() query: HarvestReportQueryDto) {
    try {
      return new ApiResponse(true, "Harvest Report", await this.reportsService.harvestReport(query), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('all-crop-harvest')
  async getAllHarvestReport(@Query() query: HarvestQueryDto) {
    try {
      return new ApiResponse(true, "Harvest Report", await this.reportsService.allHarvestReport(query), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('produce')
  async getProduceReport(@Query() query: ProduceReportQueryDto) {
    try {
      return new ApiResponse(true, "All Produce", await this.reportsService.produceReport(query), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('all-produce')
  async getAllProduceReport(@Query() query: ProduceQueryDto) {
    try {
      return new ApiResponse(true, "All Produce", await this.reportsService.allProduceReport(query), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

}
