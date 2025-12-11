import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, BadRequestException, UseInterceptors, Query } from '@nestjs/common';
import { Crop, User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCropDto } from './dto/create-crop.dto';
import { CropService } from './crop.service';
import { UpdateCropDto } from './dto/update-crop.dto';
import { BulkCreateCropDto } from './dto/bulk-create-crop.dto';
import { RolesGuard } from 'src/guards/roles.guard'; 
import { Roles } from 'src/decorators/roles.decorator'; 
import { Role_Enum } from '../enums/role.enum';

// Define allowed roles for crop management using Role_Enum
const ALLOWED_CROP_ROLES = [
  Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
  Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
  Role_Enum.FARMER,
];

// Extended User type to include role and cooperativeId
type ExtendedUser = User & {
  role?: Role_Enum;
  cooperativeId?: string;
};

@Controller('crop')
@UseGuards(AuthGuard, RolesGuard)
@ApiTags('Crop')
@ApiBearerAuth()
export class CropController {
  constructor(private readonly cropService: CropService) { }

  @Post()
  @Roles(...ALLOWED_CROP_ROLES)
  @ApiBody({ type: CreateCropDto })
  async create(@Body() createCropDto: CreateCropDto, @CurrentUser() user: ExtendedUser): Promise<ApiResponse<Crop>> {
    try {
      // Additional validation for farmers: must have cooperativeId if farmer
      if (user.role === Role_Enum.FARMER && !user.cooperativeId) {
        throw new BadRequestException('Farmers must be associated with a cooperative to create crops');
      }
      
      const data = await this.cropService.create(createCropDto, user as any);
      return new ApiResponse<Crop>(true, "Crop Created", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('bulk-create')
  @Roles(Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER)
  async bulkCreate(@Body() createCropDto: BulkCreateCropDto, @CurrentUser() user: ExtendedUser): Promise<ApiResponse<Crop>> {
    try {
      return new ApiResponse<any>(true, "Crop Created", await this.cropService.bulkCreate(createCropDto, user as any), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  @Roles(...ALLOWED_CROP_ROLES, Role_Enum.AGRONOMIST, Role_Enum.VETERINARIAN, Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.BUYER)
  async findAll(@CurrentUser() user: ExtendedUser) {
    try {
      const data = await this.cropService.findAll(user as any);
      return new ApiResponse<Crop[]>(true, "All Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crop-types/:cropId')
  @Roles(...ALLOWED_CROP_ROLES, Role_Enum.AGRONOMIST, Role_Enum.VETERINARIAN, Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.BUYER)
  async findAllCropTypes(@Param('cropId') cropId: string) {
    try {
      return new ApiResponse(true, "Crop Types", await this.cropService.getCropTypesByCrop(cropId), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crops-card-data')
  @Roles(...ALLOWED_CROP_ROLES, Role_Enum.AGRONOMIST, Role_Enum.VETERINARIAN, Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.BUYER)
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'cooperativeId', required: false, type: String })
  async getCropsCardData(@Query('locationId') locationId?: number, @Query('cooperativeId') cooperativeId?: string) {
    try {
      const data = await this.cropService.cropsCardData(locationId, cooperativeId);
      return new ApiResponse(true, "Crops Card Data", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crop-type-data')
  @Roles(...ALLOWED_CROP_ROLES, Role_Enum.AGRONOMIST, Role_Enum.VETERINARIAN, Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.BUYER)
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'cropTypeId', required: false, type: String })
  async getCropTypeCardData(@Query('locationId') locationId?: number, @Query('cropTypeId') cropTypeId?: string) {
    try {
      const data = await this.cropService.getCropTypeStatistics(cropTypeId, locationId);
      return new ApiResponse(true, "Crop Type Data", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer-crops-by-location/:locationId')
  @Roles(...ALLOWED_CROP_ROLES, Role_Enum.AGRONOMIST, Role_Enum.VETERINARIAN, Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.BUYER)
  async findAllCropFarmerRegistration(@Param('locationId') locationId: string) {
    try {
      const data = await this.cropService.findAllCropFarmerRegistration(parseInt(locationId));
      return new ApiResponse(true, "All Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  @Roles(...ALLOWED_CROP_ROLES, Role_Enum.AGRONOMIST, Role_Enum.VETERINARIAN, Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.BUYER)
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.cropService.findOne(id);
      return new ApiResponse<Crop>(true, "Crop Retrieved", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  @Roles(...ALLOWED_CROP_ROLES)
  async update(@Param('id') id: string, @Body() updateCropDto: UpdateCropDto, @CurrentUser() user: ExtendedUser) {
    try {
      const data = await this.cropService.update(id, updateCropDto);
      return new ApiResponse<Crop>(true, "Crop Updated", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  @Roles(Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER)
  async remove(@Param('id') id: string, @CurrentUser() user: ExtendedUser) {
    try {
      const data = await this.cropService.remove(id);
      return new ApiResponse<Crop>(true, "Crop Deleted", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('upload-crops')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER)
  async uploadCrops(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: ExtendedUser) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
      const data = await this.cropService.importCrops(file, user as any);
      return new ApiResponse<any>(true, "All Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}