import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SlaughterHouseService } from './slaughter-house.service';
import { CreateSlaughterHouseDto } from './dto/create-slaughter-house.dto';
import { UpdateSlaughterHouseDto } from './dto/update-slaughter-house.dto';

@Controller('slaughter-house')
export class SlaughterHouseController {
  constructor(private readonly slaughterHouseService: SlaughterHouseService) {}

  @Post()
  create(@Body() createSlaughterHouseDto: CreateSlaughterHouseDto) {
    return this.slaughterHouseService.create(createSlaughterHouseDto);
  }

  @Get()
  findAll() {
    return this.slaughterHouseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.slaughterHouseService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSlaughterHouseDto: UpdateSlaughterHouseDto) {
    return this.slaughterHouseService.update(+id, updateSlaughterHouseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.slaughterHouseService.remove(+id);
  }
}
