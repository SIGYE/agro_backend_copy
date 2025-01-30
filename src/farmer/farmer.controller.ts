import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { FarmerService } from './farmer.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { AssignCropToFarmerDto } from './dto/assign-crop-to-farmerDto';
import { AssignAnimalToFarmerDto } from './dto/assign-animal-to-famer.dto';
import { UpdateCropFarmerDto } from './dto/update-crop-farmer.dto';
import { UpdateAnimalFarmerDto } from './dto/update-animal-farmer.dto';

@Controller('farmer')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Farmer')

export class FarmerController {
  constructor(private readonly farmerService: FarmerService) { }

  @Post('register-farmer')
  @ApiBody({ type: CreateFarmerDto })
  async create(@Body() createFarmerDto: CreateFarmerDto) {
    try {
      return new ApiResponse(true, "Farmer Created", await this.farmerService.registerFarmer(createFarmerDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    return new ApiResponse(true, "All Farmers", await this.farmerService.findAll(), null);
  }
  @Get('farmer-crops')
  async findAllFarmerCrops() {
    return new ApiResponse(true, "All Farmers Crops", await this.farmerService.getAllAnimalFarmerRegistrations(), null);
  }
  @Get('farmer-animals')
  async findAllFarmerAnimals() {
    return new ApiResponse(true, "All Farmers Animals", await this.farmerService.getAllCropFarmerRegistrations(), null);
  }
  @Get('farmers-by-cooperative/:id')
  async findAllFarmersByCooperative(@Param('id') id: string) {
    return new ApiResponse(true, "All Farmers By Cooperative", await this.farmerService.getFarmersByCooperative(id), null);
  }
  @Get('farmers-by-location/:id')
  async findAllFarmersByLocation(@Param('id') id: number) {
    return new ApiResponse(true, "All Farmers By Location", await this.farmerService.getFarmersByLocation(id), null)
  }
  @Get('farmer-crops-by-location/:id')
  async findAllFarmerCropsByLocation(@Param('id') id: number) {
    return new ApiResponse(true, "All Farmers Crops By Location", await this.farmerService.getCropFarmerRegistrationsByLocation(id), null)
  }
  @Get('crops-by-farmer/:id')
  async findAllCropsByFarmer(@Param('id') id: string) {
    return new ApiResponse(true, "All Crops By Farmer", await this.farmerService.getCropsFarmerRegistrationsByFarmer(id), null)
  }
  @Get('animals-by-farmer/:id')
  async findAllCropsByCooperative(@Param('id') id: string) {
    return new ApiResponse(true, "All Animals By Farmer", await this.farmerService.getAnimalFarmerRegistrationsByFarmer(id), null)
  }
  @Get('farmer-animals-by-location/:id')
  async findAllFarmerAnimalsByLocation(@Param('id') id: number) {
    return new ApiResponse(true, "All Farmers Animals By Location", await this.farmerService.getAnimalRegistrationsByLocation(id), null)
  }
  @Get('livestocks-by-farmerRegistration/:id')
  async findAllLiveStocksByFarmerRegistration(@Param('id') id: string) {
    return new ApiResponse(true, "All Live Stocks By Farmer Registration", await this.farmerService.getAnimalFarmerRegistrationLivestock(id), 200)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new ApiResponse(true, "Farmer Retrieved", await this.farmerService.findOne(id), null);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateFarmerDto: UpdateFarmerDto) {
  //   return this.farmerService.update(+id, updateFarmerDto);
  // }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return new ApiResponse(true, "Farmer Deleted", await this.farmerService.remove(id), null);
  }
  @Put('assign-crops-to-farmer')
  async assignCropsToFarmer(@Body() data: AssignCropToFarmerDto) {
    return new ApiResponse(true, "Crops Assigned", await this.farmerService.assignCropsToFarmers(data), null);
  }
  @Put('assign-animals-to-farmer')
  async assignAnimalsToFarmer(@Body() data: AssignAnimalToFarmerDto) {
    return new ApiResponse(true, "Animals Assigned", await this.farmerService.assignAnimalsToFarmer(data), null);
  }

  @Put('update-crop-farmer-registration/:id')
  async updateCropFarmerRegistration(@Param('id') id: string, @Body() data: UpdateCropFarmerDto) {
    return new ApiResponse(true, "Crop Farmer Registration Updated", await this.farmerService.updateCropFarmerRegistration(id, data), 201);
  }

  @Put('update-animal-farmer-registration/:id')
  async updateAnimalFarmerRegistration(@Param('id') id: string, @Body() data: UpdateAnimalFarmerDto) {
    return new ApiResponse(true, "Animal Farmer Registration Updated", await this.farmerService.updateAnimalFarmerRegistration(id, data), 201);
  }
}
