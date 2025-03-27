import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { LocationLevelNameService } from './location_level_name.service';
import { CreateLocationLevelNameDto } from './dto/create-location_level_name.dto';
import { UpdateLocationLevelNameDto } from './dto/update-location_level_name.dto';

@Controller('location-level-name')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Location Level Name')
export class LocationLevelNameController {
  constructor(private readonly locationLevelNameService: LocationLevelNameService) { }

  @Post()
  async create(@Body() createLocationLevelNameDto: CreateLocationLevelNameDto) {
    try {
      return new ApiResponse(
        true,
        "Location Level Name Created",
        await this.locationLevelNameService.create(createLocationLevelNameDto),
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
        "All Location Level Names",
        await this.locationLevelNameService.findAll(),
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
        "Location Level Name Retrieved",
        await this.locationLevelNameService.findOne(+id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('by-country/:countryId')
  async findByCountry(@Param('countryId') countryId: string) {
    try {
      return new ApiResponse(
        true,
        "Location Level Names By Country",
        await this.locationLevelNameService.findByCountry(+countryId),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLocationLevelNameDto: UpdateLocationLevelNameDto
  ) {
    try {
      return new ApiResponse(
        true,
        "Location Level Name Updated",
        await this.locationLevelNameService.update(+id, updateLocationLevelNameDto),
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
        "Location Level Name Deleted",
        await this.locationLevelNameService.remove(+id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}