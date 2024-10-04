import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('cooperative')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Cooperative')
export class CooperativeController {
  constructor(private readonly cooperativeService: CooperativeService) { }

  @Post()
  create(@Body() createCooperativeDto: CreateCooperativeDto) {
    return this.cooperativeService.create(createCooperativeDto);
  }

  @Get()
  findAll() {
    return this.cooperativeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cooperativeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCooperativeDto: UpdateCooperativeDto) {
    return this.cooperativeService.update(+id, updateCooperativeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cooperativeService.remove(+id);
  }
}
