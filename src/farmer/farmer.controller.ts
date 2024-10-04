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
  create(@Body() createFarmerDto: CreateFarmerDto) {
    new ApiResponse(true, "Farmer Created", this.farmerService.registerFarmer(createFarmerDto), null);
  }

  @Get()
  findAll() {
    new ApiResponse(true, "All Farmers", this.farmerService.findAll(), null);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    new ApiResponse(true, "Farmer Retrieved", this.farmerService.findOne(id), null);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateFarmerDto: UpdateFarmerDto) {
  //   return this.farmerService.update(+id, updateFarmerDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    new ApiResponse(true, "Farmer Deleted", this.farmerService.remove(id), null);
  }
  @Put('assign-crops-to-farmer')
  assignCropsToFarmer(@Body() data: AssignCropToFarmerDto) {
    new ApiResponse(true, "Crops Assigned", this.farmerService.assignCropsToFarmers(data), null);
  }
}
