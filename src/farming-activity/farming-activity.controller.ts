import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FarmingActivityService } from './farming-activity.service';
import { CreateFarmingActivityDto } from './dto/create-farming-activity.dto';
import { UpdateFarmingActivityDto } from './dto/update-farming-activity.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';

@Controller('farming-activity')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Farming Activity')
export class FarmingActivityController {
  constructor(private readonly farmingActivityService: FarmingActivityService) { }

  @Post()
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

  @Get(':id')
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
  async update(@Param('id') id: string, @Body() updateFarmingActivityDto: UpdateFarmingActivityDto) {
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