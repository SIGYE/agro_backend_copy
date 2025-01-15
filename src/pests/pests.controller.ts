import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { PestType, User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';
import { PestsService } from './pests.service';
import { AssignPestDto } from './dto/assign-pest.dto';
import { UpdatePestDto } from './dto/update-pest.dto';
import { CreatePestDto } from './dto/create-pest.dto';

@Controller('pests')
@ApiTags('Pests')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PestsController {
  constructor(private readonly pestService: PestsService) { }

  @Post()
  async create(@Body() createPestDto: CreatePestDto, @CurrentUser() user: User) {
    try {
      return new ApiResponse(true, "Pest Created", await this.pestService.create(createPestDto, user.id), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);

    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Pests", await this.pestService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('/all-by-type/:type')
  async findAllByType(@Param('type') type: PestType) {
    try {
      return new ApiResponse(true, "Pest Retrieved", await this.pestService.findAllByType(type), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('/all/type/:type/farmer/:farmer')
  async findAllByTypeAndFarmer(@Param('type') type: PestType, @Param('farmer') farmer: string) {
    try {
      return new ApiResponse(true, "Pest Retrieved", await this.pestService.findAllByTypeAndUserId(type, farmer), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Pest Retrieved", await this.pestService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Put('/assign')
  async assignPest(@Body() assignPestDto: AssignPestDto) {
    try {
      return new ApiResponse(true, "Pest Assigned", await this.pestService.assignPests(assignPestDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePestDto: UpdatePestDto) {
    try {
      return new ApiResponse(true, "Pest Updated", await this.pestService.update(id, updatePestDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Pest Deleted", await this.pestService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
