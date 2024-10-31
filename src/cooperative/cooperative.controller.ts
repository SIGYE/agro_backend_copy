import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { AssignCropToCooperativeDto } from './dto/assignCooperativeCrop.dto';
import { AssignAnimalToCooperativeDto } from './dto/assignCooperativeAnimals.dto';

@Controller('cooperative')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Cooperative')
export class CooperativeController {
  constructor(private readonly cooperativeService: CooperativeService) { }

  @Post()
  async create(@Body() createCooperativeDto: CreateCooperativeDto) {
    return new ApiResponse(true, "Cooperative Created", await this.cooperativeService.create(createCooperativeDto), null);
  }

  @Get()
  async findAll() {
    return new ApiResponse(true, "All Cooperatives", await this.cooperativeService.findAll(), null);

  }
  @Get('by-location/:locationId')
  async findAllCooperativesByLocation(@Param('locationId') locationId: string) {
    return new ApiResponse(true, "All Cooperatives", await this.cooperativeService.findAllCooperativesByLocation(parseInt(locationId)), null);

  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new ApiResponse(true, "Cooperative Retrieved", await this.cooperativeService.findOne(id), null);
  }
  @Get('crops-by-cooperative/:id')
  async findAllCropsByCooperative(@Param('id') id: string) {
    return new ApiResponse(true, "All Crops By Cooperative", await this.cooperativeService.findAllCooperativeCrops(id), null);
  }
  @Get('animals-by-cooperative/:id')
  async findAllAnimalsByCooperative(@Param('id') id: string) {
    return new ApiResponse(true, "All Animals By Cooperative", await this.cooperativeService.findAllCooperativeAnimals(id), null);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCooperativeDto: UpdateCooperativeDto) {
    return new ApiResponse(true, "Cooperative Updated", await this.cooperativeService.update(id, updateCooperativeDto), null);
  }
  @Put('assign-farmers-to-cooperative')
  async assignFarmersToCooperative(@Body() data: AssignFarmersTOCooperative) {
    return new ApiResponse(true, "Farmers Assigned", await this.cooperativeService.assignFarmersToCooperative(data), null);
  }
  @Put('assign-crops-to-cooperative')
  async assignCropsToCooperative(@Body() data: AssignCropToCooperativeDto) {
    return new ApiResponse(true, "Crops Assigned", await this.cooperativeService.assignCropsToCooperative(data), null);
  }

  @Put('assign-animals-to-cooperative')
  async assignAnimalsToCooperative(@Body() data: AssignAnimalToCooperativeDto) {
    return new ApiResponse(true, "Animals Assigned", await this.cooperativeService.assignAnimalsToCooperative(data), null);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return new ApiResponse(true, "Cooperative Deleted", await this.cooperativeService.remove(id), null);
  }
}
