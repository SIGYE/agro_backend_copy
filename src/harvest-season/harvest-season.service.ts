import { Injectable } from '@nestjs/common';
import { CreateHarvestSeasonDto } from './dto/create-harvest-season.dto';
import { UpdateHarvestSeasonDto } from './dto/update-harvest-season.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class HarvestSeasonService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createHarvestSeasonDto: CreateHarvestSeasonDto) {
    try {
      return await this.databaseService.harvestSeason.create({
        data: {
          name: createHarvestSeasonDto.name,
          startDate: new Date(createHarvestSeasonDto.startDate),
          endDate: new Date(createHarvestSeasonDto.endDate),
          seasonStatus: createHarvestSeasonDto.seasonStatus
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.harvestSeason.findMany({
        include: {
          seasons: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.harvestSeason.findUnique({
        where: {
          id: id
        },
        include: {
          seasons: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findCurrent() {
    try {
      const currentDate = new Date();
      return await this.databaseService.harvestSeason.findFirst({
        where: {
          startDate: {
            lte: currentDate
          },
          endDate: {
            gte: currentDate
          }
        },
        include: {
          seasons: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateHarvestSeasonDto: UpdateHarvestSeasonDto) {
    try {
      const data: any = {};

      if (updateHarvestSeasonDto.name) {
        data.name = updateHarvestSeasonDto.name;
      }

      if (updateHarvestSeasonDto.startDate) {
        data.startDate = new Date(updateHarvestSeasonDto.startDate);
      }

      if (updateHarvestSeasonDto.endDate) {
        data.endDate = new Date(updateHarvestSeasonDto.endDate);
      }
      if (updateHarvestSeasonDto.seasonStatus)
        data.seasonStatus = updateHarvestSeasonDto.seasonStatus

      return await this.databaseService.harvestSeason.update({
        where: {
          id: id
        },
        data: data
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.harvestSeason.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}