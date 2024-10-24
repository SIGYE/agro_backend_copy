import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DiseaseService } from './disease.service';
import { CreateDiseaseDto } from './dto/create-disease.dto';
import { UpdateDiseaseDto } from './dto/update-disease.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';

@Controller('disease')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class DiseaseController {
  constructor(private readonly diseaseService: DiseaseService) { }

  @Post()
  async create(@Body() createDiseaseDto: CreateDiseaseDto, @CurrentUser() user: User) {
    try {
      return new ApiResponse(true, "Disease Created", await this.diseaseService.create(createDiseaseDto, user.id), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);

    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Diseases", await this.diseaseService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Disease Retrieved", await this.diseaseService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDiseaseDto: UpdateDiseaseDto) {
    try {
      return new ApiResponse(true, "Disease Updated", await this.diseaseService.update(id, updateDiseaseDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Disease Deleted", await this.diseaseService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
