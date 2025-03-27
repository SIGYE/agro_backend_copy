import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateLocationLevelNameDto } from './dto/create-location_level_name.dto';
import { UpdateLocationLevelNameDto } from './dto/update-location_level_name.dto';

@Injectable()
export class LocationLevelNameService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createLocationLevelNameDto: CreateLocationLevelNameDto) {
    try {
      return await this.databaseService.location_Level_Name.create({
        data: {
          name: createLocationLevelNameDto.name,
          code: createLocationLevelNameDto.code,
          order_number: createLocationLevelNameDto.order_number,
          countryId: createLocationLevelNameDto.countryId
        },
        include: {
          country: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.location_Level_Name.findMany({
        include: {
          country: true
        },
        orderBy: {
          order_number: 'asc'
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: number) {
    try {
      return await this.databaseService.location_Level_Name.findUnique({
        where: {
          id: id
        },
        include: {
          country: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findByCountry(countryId: number) {
    try {
      return await this.databaseService.location_Level_Name.findMany({
        where: {
          countryId: countryId
        },
        include: {
          country: true
        },
        orderBy: {
          order_number: 'asc'
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: number, updateLocationLevelNameDto: UpdateLocationLevelNameDto) {
    try {
      const data: any = {};

      if (updateLocationLevelNameDto.name !== undefined) {
        data.name = updateLocationLevelNameDto.name;
      }

      if (updateLocationLevelNameDto.code !== undefined) {
        data.code = updateLocationLevelNameDto.code;
      }

      if (updateLocationLevelNameDto.order_number !== undefined) {
        data.order_number = updateLocationLevelNameDto.order_number;
      }

      if (updateLocationLevelNameDto.countryId !== undefined) {
        data.countryId = updateLocationLevelNameDto.countryId;
      }

      return await this.databaseService.location_Level_Name.update({
        where: {
          id: id
        },
        data: data,
        include: {
          country: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: number) {
    try {
      return await this.databaseService.location_Level_Name.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}