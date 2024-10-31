import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LiveStockRegistrationService } from './live-stock-registration.service';
import { CreateLiveStockRegistrationDto } from './dto/create-live-stock-registration.dto';
import { UpdateLiveStockRegistrationDto } from './dto/update-live-stock-registration.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';

@Controller('live-stock-registration')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('LiveStockRegistration')
export class LiveStockRegistrationController {
  constructor(private readonly liveStockRegistrationService: LiveStockRegistrationService) { }

  @Post()
  async create(@Body() createLiveStockRegistrationDto: CreateLiveStockRegistrationDto) {
    try {
      return new ApiResponse(true, "Live Stock Registration Created", await this.liveStockRegistrationService.create(createLiveStockRegistrationDto), 201);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Live Stock Registrations", await this.liveStockRegistrationService.findAll(), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('animals-by-livestock/:id')
  async findAllAnimalsByLiveStock(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Animals By Live Stock", await this.liveStockRegistrationService.findAllAnimalsInLivesStockRegistration(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Live Stock Registration Retrieved", await this.liveStockRegistrationService.findOne(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateLiveStockRegistrationDto: UpdateLiveStockRegistrationDto) {
    try {
      return new ApiResponse(true, "Live Stock Registration Updated", await this.liveStockRegistrationService.update(id, updateLiveStockRegistrationDto), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Live Stock Registration Deleted", await this.liveStockRegistrationService.remove(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
}
