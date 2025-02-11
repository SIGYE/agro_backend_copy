import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ApiResponse } from 'src/responses/api.response';
import { query } from 'express';
import { PaginationQueryDto } from 'src/pagination/pagination.dto';
import { HarvestReportQueryDto } from 'src/pagination/HarvestReportQuery.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Post()
  create(@Body() createReportDto: CreateReportDto) {
    // return this.reportsService.create(createReportDto);
  }

  @Get('crop-harvest/location/:locationId')
  async getHarvestReport(@Query() query: HarvestReportQueryDto, @Param('locationId') locationId?: number) {
    try {
      return new ApiResponse(true, "All Produce", await this.reportsService.harvestReport(query, locationId), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto) {
    return this.reportsService.update(+id, updateReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportsService.remove(+id);
  }
}
