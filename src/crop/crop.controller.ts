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

@Controller('crop')
@UseGuards(AuthGuard)
@ApiTags('Crop')
@ApiBearerAuth()
export class CropController {
  constructor(private readonly cropService: CropService) { }

  @Post()
  @ApiBody({ type: CreateCropDto })
  async create(@Body() createCropDto: CreateCropDto, @CurrentUser() user: User): Promise<ApiResponse<Crop>> {
    try {
      const data = await this.cropService.create(createCropDto, user);
      return new ApiResponse<Crop>(true, "Crop Created", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    try {
      const data = await this.cropService.findAll(user);
      return new ApiResponse<Crop[]>(true, "All Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('crop-types/:cropId')
  async findAllCropTypes(@Param('cropId') cropId: string) {
    try {
      return new ApiResponse(true, "Crop Types", await this.cropService.getCropTypesByCrop(cropId), 200)
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('crops-card-data')
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
  async findAllCropFarmerRegistration(@Param('locationId') locationId: string) {
    try {
      const data = await this.cropService.findAllCropFarmerRegistration(parseInt(locationId));
      return new ApiResponse(true, "All Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.cropService.findOne(id);
      return new ApiResponse<Crop>(true, "Crop Retrieved", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }


  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCropDto: UpdateCropDto) {
    try {
      const data = await this.cropService.update(id, updateCropDto);
      return new ApiResponse<Crop>(true, "Crop Updated", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const data = await this.cropService.remove(id);
      return new ApiResponse<Crop>(true, "Crop Deleted", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('upload-crops')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCrops(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
      const data = await this.cropService.importCrops(file, user);
      return new ApiResponse<any>(true, "All Crops", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}