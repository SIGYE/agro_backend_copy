import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LiveStockRegistrationService } from './live-stock-registration.service';
import { CreateLiveStockRegistrationDto } from './dto/create-live-stock-registration.dto';
import { UpdateLiveStockRegistrationDto } from './dto/update-live-stock-registration.dto';

@Controller('live-stock-registration')
export class LiveStockRegistrationController {
  constructor(private readonly liveStockRegistrationService: LiveStockRegistrationService) {}

  @Post()
  create(@Body() createLiveStockRegistrationDto: CreateLiveStockRegistrationDto) {
    return this.liveStockRegistrationService.create(createLiveStockRegistrationDto);
  }

  @Get()
  findAll() {
    return this.liveStockRegistrationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.liveStockRegistrationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLiveStockRegistrationDto: UpdateLiveStockRegistrationDto) {
    return this.liveStockRegistrationService.update(+id, updateLiveStockRegistrationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.liveStockRegistrationService.remove(+id);
  }
}
