import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';

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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCooperativeDto: UpdateCooperativeDto) {
    return new ApiResponse(true, "Cooperative Updated", await this.cooperativeService.update(id, updateCooperativeDto), null);
  }
  @Put('assign-farmers-to-cooperative')
  async assignFarmersToCooperative(@Body() data: AssignFarmersTOCooperative) {
    return new ApiResponse(true, "Farmers Assigned", await this.cooperativeService.assignFarmersToCooperative(data), null);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return new ApiResponse(true, "Cooperative Deleted", await this.cooperativeService.remove(id), null);
  }
}
