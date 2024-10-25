import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, BadRequestException, UseInterceptors } from '@nestjs/common';

import { Crop, User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
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
    return new ApiResponse<Crop>(true, "Crop Created", await this.cropService.create(createCropDto, user.id), null);
  }

  @Get()
  async findAll() {
    return new ApiResponse<Crop[]>(true, "All Crops", await this.cropService.findAll(), null);
  }
  @Get('farmer-crops-by-location/:locationId')
  async findAllCropFarmerRegistration(@Param('locationId') locationId: string) {
    return new ApiResponse(true, "All Crops", await this.cropService.findAllCropFarmerRegistration(parseInt(locationId)), null);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new ApiResponse<Crop>(true, "Crop Retrieved", await this.cropService.findOne(id), null);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCropDto: UpdateCropDto) {
    return new ApiResponse<Crop>(true, "Crop Updated", await this.cropService.update(id, updateCropDto), null);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return new ApiResponse<Crop>(true, "Crop Deleted", await this.cropService.remove(id), null);
  }
  @Post('upload-crops')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCrops(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return new ApiResponse<any>(true, "All Crops", await this.cropService.importCrops(file, user.id), null);
  }
}
