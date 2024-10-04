import { Injectable } from '@nestjs/common';
import { CreateLiveStockRegistrationDto } from './dto/create-live-stock-registration.dto';
import { UpdateLiveStockRegistrationDto } from './dto/update-live-stock-registration.dto';

@Injectable()
export class LiveStockRegistrationService {
  create(createLiveStockRegistrationDto: CreateLiveStockRegistrationDto) {
    return 'This action adds a new liveStockRegistration';
  }

  findAll() {
    return `This action returns all liveStockRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} liveStockRegistration`;
  }

  update(id: number, updateLiveStockRegistrationDto: UpdateLiveStockRegistrationDto) {
    return `This action updates a #${id} liveStockRegistration`;
  }

  remove(id: number) {
    return `This action removes a #${id} liveStockRegistration`;
  }
}
