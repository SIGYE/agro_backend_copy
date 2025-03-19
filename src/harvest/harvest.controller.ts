import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';

@Controller('harvest')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Harvest')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) { }

  @Post()
  async create(@Body() createHarvestDto: CreateHarvestDto) {
    try {
      return new ApiResponse(true, "Harvest Created", await this.harvestService.create(createHarvestDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Harvests", await this.harvestService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('season/:seasonId')
  async findAllBySeason(@Param('seasonId') seasonId: string) {
    try {
      return new ApiResponse(
        true,
        "Harvests By Season",
        await this.harvestService.findAllBySeason(seasonId),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Harvest Retrieved", await this.harvestService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateHarvestDto: UpdateHarvestDto) {
    try {
      return new ApiResponse(true, "Harvest Updated", await this.harvestService.update(id, updateHarvestDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Harvest Deleted", await this.harvestService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}