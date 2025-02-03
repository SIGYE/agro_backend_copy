import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { ApiResponse } from 'src/responses/api.response';
import { ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('seasons')
@ApiTags("Seasons")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) { }

  @Post()
  async create(@Body() createSeasonDto: CreateSeasonDto) {
    try {
      return new ApiResponse(true, "Season Created", await this.seasonsService.create(createSeasonDto), 201)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }


  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Seasons", await this.seasonsService.findAll(), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Get('/crop-type/:id')
  async findAllByCropType(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Seasons", await this.seasonsService.findAllByCropTypeId(id), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Get('/farmer/:id')
  async findAllByFarmer(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Seasons", await this.seasonsService.findAllByFarmerId(id), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Get('/farmer/:farmerId/crop-type/:cropTypeId')
  async findAllByFarmerAndCropType(@Param('farmerId') farmerId: string, @Param('cropTypeId') cropTypeId: string) {
    try {
      return new ApiResponse(true, "All Seasons", await this.seasonsService.findAllByFarmerIdAndCropTypeId(farmerId, cropTypeId), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Season", await this.seasonsService.findOne(id), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }


  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSeasonDto: UpdateSeasonDto) {
    try {
      return new ApiResponse(true, "Season Updated", await this.seasonsService.update(id, updateSeasonDto), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }


  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Season Deleted", await this.seasonsService.remove(id), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
}
