import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { SlaughterHouseService } from './slaughter-house.service';
import { CreateSlaughterHouseDto } from './dto/create-slaughter-house.dto';
import { UpdateSlaughterHouseDto } from './dto/update-slaughter-house.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { SlaughterAnimalDto } from './dto/slaughter-animal.dto';
import { SlaughterRegistrationDto } from './dto/slaughter-registration.dto';
import { SlaughterProductDto } from './dto/slaughter-product.dto';
import { AnimalSlaughtProductDto } from './dto/animal-slaught-product.dto';

@Controller('slaughter-house')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('SlaughterHouse')
export class SlaughterHouseController {
  constructor(private readonly slaughterHouseService: SlaughterHouseService) { }

  @Post()
  async create(@Body() createSlaughterHouseDto: CreateSlaughterHouseDto) {
    try {
      new ApiResponse(true, "Slaughter House Created", await this.slaughterHouseService.create(createSlaughterHouseDto), 201);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      new ApiResponse(true, "All Slaughter Houses", await this.slaughterHouseService.findAll(), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      new ApiResponse(true, "Slaughter House Retrieved", await this.slaughterHouseService.findOne(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSlaughterHouseDto: UpdateSlaughterHouseDto) {
    try {
      new ApiResponse(true, "Slaughter House Updated", await this.slaughterHouseService.update(id, updateSlaughterHouseDto), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Put('assign-animals-to-slaughter-house/:id')
  async assignAnimalsToSlaughterHouse(@Param('id') id: string, @Body() data: SlaughterAnimalDto[]) {
    try {
      new ApiResponse(true, "Animals Assigned", await this.slaughterHouseService.assignAnimalsToSlaughterHouse(id, data), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('animal-slaughter-registrations-by-slaughter-house/:id')
  async findAllAnimalSlaughterRegistrationsBySlaughterHouse(@Param('id') id: string) {
    try {
      new ApiResponse(true, "All Animal Slaughter Registrations", await this.slaughterHouseService.findAllSlaughterAnimalRegistrationsBySlaughterHouseId(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Post('slaughter-registration')
  async createSlaughterRegistration(@Body() data: SlaughterRegistrationDto) {
    try {
      new ApiResponse(true, "Slaughter Registration Created", await this.slaughterHouseService.createSlaughterRegistration(data), 201);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('slaughter-registration')
  async findAllSlaughterRegistration() {
    try {
      new ApiResponse(true, "All Slaughter Registrations", await this.slaughterHouseService.findAllSlaughterRegistrations(), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('slaughter-registration-by-animal-registration/:id')
  async findAllSlaughterRegistrationByAnimalRegistration(@Param('id') id: string) {
    try {
      new ApiResponse(true, "All Slaughter Registrations", await this.slaughterHouseService.findAllSlaughterRegistrationsByAnimalRegistrationId(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Post('animal-products')
  async createAnimalProducts(@Body() data: SlaughterProductDto) {
    try {
      new ApiResponse(true, "Animal Products Created", await this.slaughterHouseService.createSlaughterProduct(data), 201);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('animal-products')
  async findAllAnimalProducts() {
    try {
      new ApiResponse(true, "All Animal Products", await this.slaughterHouseService.findAllSlaughterProducts(), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Post('slaughter-products')
  async createSlaughterProducts(@Body() data: AnimalSlaughtProductDto) {
    try {
      new ApiResponse(true, "Slaughter Products Created", await this.slaughterHouseService.createAnimalSlaughterProduct(data), 201);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('slaughter-products')
  async findAllSlaughterProducts() {
    try {
      new ApiResponse(true, "All Slaughter Products", await this.slaughterHouseService.findAllAnimalSlaughterProducts(), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('slaughter-products-by-slaughter-registration/:id')
  async findAllSlaughterProductsBySlaughtRegistration(@Param('id') id: string) {
    try {
      new ApiResponse(true, "All Slaughter Products", await this.slaughterHouseService.findAllSlaughterProductsBySlaughterRegistrationId(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }


  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      new ApiResponse(true, "Slaughter House Deleted", await this.slaughterHouseService.remove(id), 200);
    } catch (e) {
      new ApiResponse(false, e.message, null, 400);
    }
  }
}
