import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { FarmerService } from './farmer.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { AssignCropToFarmerDto } from './dto/assign-crop-to-farmerDto';
import { AssignAnimalToFarmerDto } from './dto/assign-animal-to-famer.dto';
import { UpdateCropFarmerDto } from './dto/update-crop-farmer.dto';
import { UpdateAnimalFarmerDto } from './dto/update-animal-farmer.dto';
import { Allow } from 'src/decorators/allow.decorator';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Controller('farmer')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Farmer')
export class FarmerController {
  constructor(private readonly farmerService: FarmerService, private readonly databaseService: DatabaseService) { }

@Post('register-farmer')
@ApiBody({ type: CreateFarmerDto })
@Allow()
async create(@Body() createFarmerDto: CreateFarmerDto, @CurrentUser() user?: User) {
  try {
    // Check if user is authenticated and has Umufashamyumvire role
    if (user) {
      const userRole = await this.databaseService.role.findUnique({
        where: { id: user.roleId }
      });
      
      // If user is Umufashamyumvire and didn't provide location, use theirs
      if (userRole && userRole.name === 'UMUFASHAMYUMVIRE') {
        if (!createFarmerDto.locationId && user.locationId) {
          // Create a new object with the updated locationId
          const farmerData = {
            ...createFarmerDto,
            locationId: user.locationId
          };
          const data = await this.farmerService.registerFarmer(farmerData, user);
          return new ApiResponse(true, "Farmer Created by Umufashamyumvire", data, 201);
        }
      }
    }
    
    // For farmers self-registering or when location is provided
    if (!createFarmerDto.locationId) {
      return new ApiResponse(false, "Location is required", null, 400);
    }
    
    const data = await this.farmerService.registerFarmer(createFarmerDto, user);
    const message = user ? "Farmer Created" : "Farmer Self-Registered Successfully";
    return new ApiResponse(true, message, data, 201);
  } catch (e) {
    return new ApiResponse(false, e.message, null, 400);
  }
}

  @Get()
  async findAll() {
    try {
      const data = await this.farmerService.findAll();
      return new ApiResponse(true, "All Farmers", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer-crops')
  async findAllFarmerCrops() {
    try {
      const data = await this.farmerService.getAllAnimalFarmerRegistrations();
      return new ApiResponse(true, "All Farmers Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer-animals')
  async findAllFarmerAnimals() {
    try {
      const data = await this.farmerService.getAllCropFarmerRegistrations();
      return new ApiResponse(true, "All Farmers Animals", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmers-by-cooperative/:id')
  async findAllFarmersByCooperative(@Param('id') id: string) {
    try {
      const data = await this.farmerService.getFarmersByCooperative(id);
      return new ApiResponse(true, "All Farmers By Cooperative", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('individual-farmers')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async findAllIndividualFarmers(@Query('locationId') locationId?: number, @Query('page') page?: number, @Query('limit') limit?: number) {
    try {
      const data = await this.farmerService.getFarmersWithoutCooperative(locationId, page, limit);
      return new ApiResponse(true, "All Individual Farmers", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmers-by-location/:id')
  async findAllFarmersByLocation(@Param('id') id: number) {
    try {
      const data = await this.farmerService.getFarmersByLocation(id);
      return new ApiResponse(true, "All Farmers By Location", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer-crops-by-location/:id')
  async findAllFarmerCropsByLocation(@Param('id') id: number) {
    try {
      const data = await this.farmerService.getCropFarmerRegistrationsByLocation(id);
      return new ApiResponse(true, "All Farmers Crops By Location", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crops-by-farmer/:id')
  async findAllCropsByFarmer(@Param('id') id: string) {
    try {
      const data = await this.farmerService.getCropsFarmerRegistrationsByFarmer(id);
      return new ApiResponse(true, "All Crops By Farmer", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('animals-by-farmer/:id')
  async findAllCropsByCooperative(@Param('id') id: string) {
    try {
      const data = await this.farmerService.getAnimalFarmerRegistrationsByFarmer(id);
      return new ApiResponse(true, "All Animals By Farmer", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer-animals-by-location/:id')
  async findAllFarmerAnimalsByLocation(@Param('id') id: number) {
    try {
      const data = await this.farmerService.getAnimalRegistrationsByLocation(id);
      return new ApiResponse(true, "All Farmers Animals By Location", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('farmer-data')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async getFarmerData(@Query('locationId') locationId?: number) {
    try {
      const data = await this.farmerService.getFarmerData(locationId);
      return new ApiResponse(true, "All farmer data", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('livestocks-by-farmerRegistration/:id')
  async findAllLiveStocksByFarmerRegistration(@Param('id') id: string) {
    try {
      const data = await this.farmerService.getAnimalFarmerRegistrationLivestock(id);
      return new ApiResponse(true, "All Live Stocks By Farmer Registration", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('farmer-card-data')
  @ApiQuery({ name: 'locationId', required: false })
  async getFarmerCardData(@Query('locationId') locationId?: number) {
    try {
      const data = await this.farmerService.getFarmerCooperativeStatistics(locationId);
      return new ApiResponse(true, "Farmer Card Data", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('farmer-overview')
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'cooperativeId', required: false })
  async getFarmerOverView(@Query('locationId') locationId?: number, @Query('cooperativeId') cooperativeId?: string) {
    try {
      const data = await this.farmerService.getFarmerDetailedInformation(locationId, cooperativeId);
      return new ApiResponse(true, "Farmer OverView", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.farmerService.findOne(id);
      return new ApiResponse(true, "Farmer Retrieved", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const data = await this.farmerService.remove(id);
      return new ApiResponse(true, "Farmer Deleted", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('assign-crops-to-farmer')
  async assignCropsToFarmer(@Body() data: AssignCropToFarmerDto) {
    try {
      const result = await this.farmerService.assignCropsToFarmers(data);
      return new ApiResponse(true, "Crops Assigned", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('assign-animals-to-farmer')
  async assignAnimalsToFarmer(@Body() data: AssignAnimalToFarmerDto) {
    try {
      const result = await this.farmerService.assignAnimalsToFarmer(data);
      return new ApiResponse(true, "Animals Assigned", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('update-crop-farmer-registration/:id')
  async updateCropFarmerRegistration(@Param('id') id: string, @Body() data: UpdateCropFarmerDto) {
    try {
      const result = await this.farmerService.updateCropFarmerRegistration(id, data);
      return new ApiResponse(true, "Crop Farmer Registration Updated", result, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('update-animal-farmer-registration/:id')
  async updateAnimalFarmerRegistration(@Param('id') id: string, @Body() data: UpdateAnimalFarmerDto) {
    try {
      const result = await this.farmerService.updateAnimalFarmerRegistration(id, data);
      return new ApiResponse(true, "Animal Farmer Registration Updated", result, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

}