import { Injectable } from '@nestjs/common';
import { CreateSlaughterHouseDto } from './dto/create-slaughter-house.dto';
import { UpdateSlaughterHouseDto } from './dto/update-slaughter-house.dto';

@Injectable()
export class SlaughterHouseService {
  create(createSlaughterHouseDto: CreateSlaughterHouseDto) {
    return 'This action adds a new slaughterHouse';
  }

  findAll() {
    return `This action returns all slaughterHouse`;
  }

  findOne(id: number) {
    return `This action returns a #${id} slaughterHouse`;
  }

  update(id: number, updateSlaughterHouseDto: UpdateSlaughterHouseDto) {
    return `This action updates a #${id} slaughterHouse`;
  }

  remove(id: number) {
    return `This action removes a #${id} slaughterHouse`;
  }
}
