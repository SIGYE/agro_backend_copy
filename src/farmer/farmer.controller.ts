import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { FarmerService } from './farmer.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { AssignCropToFarmerDto } from './dto/assign-crop-to-farmerDto';

@Controller('farmer')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Farmer')

export class FarmerController {
  constructor(private readonly farmerService: FarmerService) { }

  @Post('register-farmer')
  @ApiBody({ type: CreateFarmerDto })
  async create(@Body() createFarmerDto: CreateFarmerDto) {
    new ApiResponse(true, "Farmer Created", await this.farmerService.registerFarmer(createFarmerDto), null);
  }

  @Get()
  async findAll() {
    new ApiResponse(true, "All Farmers", await this.farmerService.findAll(), null);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    new ApiResponse(true, "Farmer Retrieved", await this.farmerService.findOne(id), null);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateFarmerDto: UpdateFarmerDto) {
  //   return this.farmerService.update(+id, updateFarmerDto);
  // }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    new ApiResponse(true, "Farmer Deleted", await this.farmerService.remove(id), null);
  }
  @Put('assign-crops-to-farmer')
  async assignCropsToFarmer(@Body() data: AssignCropToFarmerDto) {
    new ApiResponse(true, "Crops Assigned", await this.farmerService.assignCropsToFarmers(data), null);
  }
}
