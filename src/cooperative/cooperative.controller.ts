import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { CooperativeType } from '@prisma/client';
import { CreateCooperativeFarmerDto } from './dto/create-farmer-cooperative';
import { Allow } from 'src/decorators/allow.decorator';

@Controller('cooperative')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Cooperative')
export class CooperativeController {
  constructor(private readonly cooperativeService: CooperativeService) { }
  @Allow()
  @Post()
  @ApiOperation({ summary: 'Create a new cooperative with manager and optional crops' })
  async create(@Body() createCooperativeDto: CreateCooperativeDto) {
    try {
      return new ApiResponse(
        true,
        "Cooperative Created",
        await this.cooperativeService.create(createCooperativeDto),
        201
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all cooperatives' })
  async findAll() {
    try {
      return new ApiResponse(
        true,
        "All Cooperatives",
        await this.cooperativeService.findAll(),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('by-location/:locationId')
  @ApiOperation({ summary: 'Get cooperatives by location' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  async findAllCooperativesByLocation(@Param('locationId') locationId: string) {
    try {
      return new ApiResponse(
        true,
        "All Cooperatives By Location",
        await this.cooperativeService.findAllCooperativesByLocation(parseInt(locationId)),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/:type')
  @ApiOperation({ summary: 'Get cooperatives by type' })
  @ApiParam({ name: 'type', description: 'Cooperative type', enum: CooperativeType })
  async findAllByType(@Param('type') type: CooperativeType) {
    try {
      return new ApiResponse(
        true,
        "All Cooperatives By Type",
        await this.cooperativeService.findAllBySType(type),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('by-location/:locationId/type/:type')
  @ApiOperation({ summary: 'Get cooperatives by location and type' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'type', description: 'Cooperative type', enum: CooperativeType })
  async findAllCooperativesByLocationAndType(
    @Param('locationId') locationId: string,
    @Param('type') type: CooperativeType
  ) {
    try {
      return new ApiResponse(
        true,
        "All Cooperatives By Location And Type",
        await this.cooperativeService.findAllCooperativesByLocationAndType(parseInt(locationId), type),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cooperative by ID' })
  @ApiParam({ name: 'id', description: 'Cooperative ID' })
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "Cooperative Retrieved",
        await this.cooperativeService.findOne(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crops-by-cooperative/:id')
  @ApiOperation({ summary: 'Get all crops for a specific cooperative' })
  @ApiParam({ name: 'id', description: 'Cooperative ID' })
  async findAllCropsByCooperative(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "All Crops By Cooperative",
        await this.cooperativeService.findAllCooperativeCrops(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('cooperative-crop-data/:id')
  @ApiOperation({ summary: 'Get crop production data for a cooperative' })
  @ApiParam({ name: 'id', description: 'Cooperative ID' })
  async getCooperativeCropData(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "All Cooperative Crop Data",
        await this.cooperativeService.findAllCooperativeCropsProduceAndArea(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('animals-by-cooperative/:id')
  @ApiOperation({ summary: 'Get all animals for a specific cooperative' })
  @ApiParam({ name: 'id', description: 'Cooperative ID' })
  async findAllAnimalsByCooperative(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "All Animals By Cooperative",
        await this.cooperativeService.findAllCooperativeAnimals(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cooperative' })
  @ApiParam({ name: 'id', description: 'Cooperative ID' })
  async update(@Param('id') id: string, @Body() updateCooperativeDto: UpdateCooperativeDto) {
    try {
      return new ApiResponse(
        true,
        "Cooperative Updated",
        await this.cooperativeService.update(id, updateCooperativeDto),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('assign-farmers-to-cooperative')
  @ApiOperation({ summary: 'Assign existing farmers to a cooperative and inherit crops' })
  @ApiBody({ type: AssignFarmersTOCooperative })
  async assignFarmersToCooperative(@Body() data: AssignFarmersTOCooperative) {
    try {
      const result = await this.cooperativeService.assignFarmersToCooperative(data);
      return new ApiResponse(
        true,
        `Farmers assigned to cooperative and inherited ${result.farmersInheritedCrops.length > 0 ? 'crops' : 'no crops'}`,
        result,
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('assign-create-farmers-to-cooperative')
  @ApiOperation({ summary: 'Create new farmers and assign them to a cooperative with crop inheritance' })
  @ApiBody({ type: CreateCooperativeFarmerDto })
  async assignCreateFarmersToCooperative(@Body() data: CreateCooperativeFarmerDto) {
    try {
      const result = await this.cooperativeService.assignCreateFarmerToCooperative(data);
      return new ApiResponse(
        true,
        `Farmers created and assigned to cooperative with crop inheritance`,
        result,
        201
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post(':cooperativeId/crop/:cropTypeId')
  @ApiOperation({ summary: 'Add a crop to a cooperative and assign to all its farmers' })
  @ApiParam({ name: 'cooperativeId', description: 'Cooperative ID' })
  @ApiParam({ name: 'cropTypeId', description: 'Crop Type ID' })
  async addCropToCooperative(
    @Param('cooperativeId') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string
  ) {
    try {
      const result = await this.cooperativeService.addCropToCooperative(cooperativeId, cropTypeId);

      let message = result.newlyRegistered
        ? `Crop added to cooperative and assigned to ${result.farmersUpdated} farmers`
        : "Crop was already registered with this cooperative";

      return new ApiResponse(true, message, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':cooperativeId/crop/:cropTypeId')
  @ApiOperation({ summary: 'Remove a crop from a cooperative' })
  @ApiParam({ name: 'cooperativeId', description: 'Cooperative ID' })
  @ApiParam({ name: 'cropTypeId', description: 'Crop Type ID' })
  @ApiQuery({
    name: 'cascadeToFarmers',
    required: false,
    type: Boolean,
    description: 'Whether to also remove the crop from all farmers in the cooperative'
  })
  async removeCropFromCooperative(
    @Param('cooperativeId') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Query('cascadeToFarmers') cascadeToFarmers: boolean = false
  ) {
    try {
      const result = await this.cooperativeService.removeCropFromCooperative(
        cooperativeId,
        cropTypeId,
        cascadeToFarmers === true
      );

      let message = cascadeToFarmers
        ? `Crop removed from cooperative and from ${result.farmersAffected} farmers`
        : `Crop removed from cooperative (farmers' registrations preserved)`;

      return new ApiResponse(true, message, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cooperative' })
  @ApiParam({ name: 'id', description: 'Cooperative ID' })
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(
        true,
        "Cooperative Deleted",
        await this.cooperativeService.remove(id),
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}