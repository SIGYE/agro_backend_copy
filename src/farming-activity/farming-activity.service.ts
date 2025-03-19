import { Injectable } from '@nestjs/common';
import { CreateFarmingActivityDto } from './dto/create-farming-activity.dto';
import { UpdateFarmingActivityDto } from './dto/update-farming-activity.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class FarmingActivityService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createFarmingActivityDto: CreateFarmingActivityDto) {
    try {
      return await this.databaseService.farmingActivity.create({
        data: {
          date: new Date(createFarmingActivityDto.date),
          activity: createFarmingActivityDto.activity,
          season: {
            connect: {
              id: createFarmingActivityDto.seasonId
            }
          }
        },
        include: {
          season: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.farmingActivity.findMany({
        include: {
          season: true
        },
        orderBy: {
          date: 'desc'
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAllBySeason(seasonId: string) {
    try {
      return await this.databaseService.farmingActivity.findMany({
        where: {
          seasonId: seasonId
        },
        include: {
          season: true
        },
        orderBy: {
          date: 'desc'
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.farmingActivity.findUnique({
        where: {
          id: id
        },
        include: {
          season: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateFarmingActivityDto: UpdateFarmingActivityDto) {
    try {
      const data: any = {};

      if (updateFarmingActivityDto.date !== undefined) {
        data.date = new Date(updateFarmingActivityDto.date);
      }

      if (updateFarmingActivityDto.activity !== undefined) {
        data.activity = updateFarmingActivityDto.activity;
      }

      if (updateFarmingActivityDto.seasonId !== undefined) {
        data.season = {
          connect: {
            id: updateFarmingActivityDto.seasonId
          }
        };
      }

      return await this.databaseService.farmingActivity.update({
        where: {
          id: id
        },
        data: data,
        include: {
          season: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.farmingActivity.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}