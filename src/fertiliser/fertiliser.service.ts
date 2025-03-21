import { Injectable } from '@nestjs/common';
import { CreateFertiliserDto } from './dto/create-fertiliser.dto';
import { UpdateFertiliserDto } from './dto/update-fertiliser.dto';
import { DatabaseService } from 'src/database/database.service';
import { FertiliserDto } from 'src/farmer/dto/fertiliser.dto';

@Injectable()
export class FertiliserService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(userId: string, createFertiliserDto: CreateFertiliserDto) {
    try {
      return await this.databaseService.feterlizer.create({
        data: {
          name: createFertiliserDto.name,
          creator: {
            connect: {
              id: userId
            }
          }
        }
      });

    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.feterlizer.findMany();
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.feterlizer.findUnique({
        where: {
          id: id
        }
      });
    }
    catch (e) {
      throw e;
    }

  }

  async update(id: string, updateFertiliserDto: UpdateFertiliserDto) {
    try {
      return await this.databaseService.feterlizer.update({
        where: {
          id: id
        },
        data: {
          name: updateFertiliserDto.name
        }
      });
    } catch (e) {
      throw e;
    }
  }
  async assignFertiliserToSeason(fertiliserDto: FertiliserDto) {
    try {
      await this.databaseService.cropFertilizerFarmerRegistration.create({
        data: {
          fertilizerId: fertiliserDto.fertiliserId,
          seasonId: fertiliserDto.seasonId,
          amount: fertiliserDto.amountOfFertilizer,
          measurementId: fertiliserDto.metricId
        }
      })
    } catch (e) {
      throw e
    }
  }
  async remove(id: string) {
    try {
      return await this.databaseService.feterlizer.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}
