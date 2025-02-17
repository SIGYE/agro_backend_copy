import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProduceService } from './produce.service';
import { CreateProduceDto } from './dto/create-produce.dto';
import { UpdateProduceDto } from './dto/update-produce.dto';
import { ApiResponse } from 'src/responses/api.response';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('produce')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Produce')
export class ProduceController {
  constructor(private readonly produceService: ProduceService) { }

  @Post()
  create(@Body() createProduceDto: CreateProduceDto) {
    return this.produceService.create(createProduceDto);
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Produce", await this.produceService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('/product/:id')
  async findAllByAnimalProduct(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Produce", await this.produceService.findAllByAnimalProductId(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('/animal-registration/:id')
  async findAllByAnimal(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Produce", await this.produceService.findAllByLivestockRegistrationId(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('/farmer/:id')
  async findAllByFarmer(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Produce", await this.produceService.findAllByFarmer(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('animal-produce-statistics')
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'cooperativeId', required: false })
  @ApiQuery({ name: 'animalProductId', required: false })
  async getAnimalProduceStatistics(@Query('locationId') locationId?: number, @Query('cooperativeId') cooperativeId?: string, @Query('animalProductId') animalProductId?: string) {
    try {
      return new ApiResponse(true, "Animal Produce Statistics", await this.produceService.getAnimalProduceStatistics(animalProductId, locationId, cooperativeId), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }


  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Produce", await this.produceService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProduceDto: UpdateProduceDto) {
    try {
      return new ApiResponse(true, "Produce Updated", await this.produceService.update(id, updateProduceDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Produce Deleted", await this.produceService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
