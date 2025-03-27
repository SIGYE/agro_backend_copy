import { Injectable } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class HarvestService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createHarvestDto: CreateHarvestDto) {
    try {
      let harvest = await this.databaseService.harvest.create({
        data: {
          name: createHarvestDto.name,
          amount: createHarvestDto.amount,
          harvestDate: new Date(createHarvestDto.harvestDate),
          season: {
            connect: {
              id: createHarvestDto.seasonId
            }
          }
        },
        include: {
          season: true
        }
      });
      let currentProduce = await this.databaseService.season.findUnique({
        where: {
          id: createHarvestDto.seasonId
        },
        select: {
          produceHarvested: true
        }
      })
      await this.databaseService.season.update({
        where: {
          id: createHarvestDto.seasonId
        },
        data: {
          produceHarvested: createHarvestDto.amount + currentProduce.produceHarvested
        }
      })
      return harvest;
    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.harvest.findMany({
        include: {
          season: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAllBySeason(seasonId: string) {
    try {
      return await this.databaseService.harvest.findMany({
        where: {
          seasonId: seasonId
        },
        include: {
          season: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.harvest.findUnique({
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

  async update(id: string, updateHarvestDto: UpdateHarvestDto) {
    try {
      const data: any = {};

      if (updateHarvestDto.name !== undefined) {
        data.name = updateHarvestDto.name;
      }

      if (updateHarvestDto.amount !== undefined) {
        data.amount = updateHarvestDto.amount;
      }

      if (updateHarvestDto.harvestDate !== undefined) {
        data.harvestDate = new Date(updateHarvestDto.harvestDate);
      }

      if (updateHarvestDto.seasonId !== undefined) {
        data.season = {
          connect: {
            id: updateHarvestDto.seasonId
          }
        };
      }

      return await this.databaseService.harvest.update({
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
      return await this.databaseService.harvest.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}