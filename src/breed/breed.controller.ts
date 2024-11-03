import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BreedService } from './breed.service';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Breed')
@Controller('breed')
export class BreedController {
  constructor(private readonly breedService: BreedService) { }

  @Post()
  async create(@Body() createBreedDto: CreateBreedDto) {
    try {
      return new ApiResponse(true, "Breed Created", await this.breedService.create(createBreedDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  async findAll() {
    try {
      return new ApiResponse(true, "All Breeds", await this.breedService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
  @Get('animal/:id')
  async findAllByAnimal(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Breeds", await this.breedService.findAllByAnimal(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Breed Retrieved", await this.breedService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBreedDto: UpdateBreedDto) {
    try {
      return new ApiResponse(true, "Breed Updated", await this.breedService.update(id, updateBreedDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "Breed Deleted", await this.breedService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
