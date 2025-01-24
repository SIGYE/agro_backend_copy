import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, BadRequestException, UseInterceptors } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { Animal, User } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateAnimalProductDto } from './dto/create-animal-product.dto';

@Controller('animal')
@UseGuards(AuthGuard)
@ApiTags('Animal')
@ApiBearerAuth()
export class AnimalController {
  constructor(private readonly animalService: AnimalService) { }

  @Post()
  @ApiBody({ type: CreateAnimalDto })
  async create(@Body() createAnimalDto: CreateAnimalDto, @CurrentUser() user: User): Promise<ApiResponse<Animal>> {
    return new ApiResponse<Animal>(true, "Animal Created", await this.animalService.create(createAnimalDto, user.id), 201);
  }
  @Post('/create-product')
  async createAnimalProduct(@Body() createAnimalProduct: CreateAnimalProductDto) {
    try {
      return new ApiResponse(true, "Animal Product Created", await this.animalService.createAnimalProduct(createAnimalProduct), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }

  }

  @Get()
  async findAll() {
    return new ApiResponse<Animal[]>(true, "All Animals", await this.animalService.findAll(), null);
  }
  @Get('products/:id')
  async findAllAnimalProducts(@Param('id') id: string) {
    try {
      return new ApiResponse(true, "All Animal Products", await this.animalService.findAllAnimalProducts(id), null);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new ApiResponse<Animal>(true, "Animal Retrieved", await this.animalService.findOne(id), null);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAnimalDto: UpdateAnimalDto) {
    return new ApiResponse<Animal>(true, "Animal Updated", await this.animalService.update(id, updateAnimalDto), null);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return new ApiResponse<Animal>(true, "Animal Deleted", await this.animalService.remove(id), null);
  }
  @Post('upload-animals')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCrops(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return new ApiResponse<any>(true, "All Animals", await this.animalService.importAnimals(file, user.id), null);
  }
}
