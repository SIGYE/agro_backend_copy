import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FertiliserService } from './fertiliser.service';
import { CreateFertiliserDto } from './dto/create-fertiliser.dto';
import { UpdateFertiliserDto } from './dto/update-fertiliser.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';

@Controller('fertiliser')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Fertiliser')
export class FertiliserController {
  constructor(private readonly fertiliserService: FertiliserService) { }

  @Post()
  async create(@Body() createFertiliserDto: CreateFertiliserDto, @CurrentUser() user: User) {
    try {
      return new ApiResponse(true, "Fertiliser Created", await this.fertiliserService.create(user.id, createFertiliserDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Fertilisers", await this.fertiliserService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }

  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Fertiliser Retrieved", await this.fertiliserService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateFertiliserDto: UpdateFertiliserDto) {
    try {
      return new ApiResponse(true, "Fertiliser Updated", await this.fertiliserService.update(id, updateFertiliserDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Fertiliser Deleted", await this.fertiliserService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }

  }
}
