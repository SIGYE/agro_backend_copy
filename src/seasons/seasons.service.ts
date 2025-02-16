import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SeasonsService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createSeasonDto: CreateSeasonDto) {
    try {
      return await this.databaseService.season.create({
        data: {
          name: createSeasonDto.name,
          plantationArea: createSeasonDto.plantationArea,
          seeds: createSeasonDto.seeds,
          produceHarvested: createSeasonDto.produceHarvested,
          expectedYield: createSeasonDto.expectedYield,
          startDate: createSeasonDto.startDate,
          endDate: createSeasonDto.endDate,
          farmer: {
            connect: {
              id: createSeasonDto.farmerId
            }
          },
          croType: {
            connect: {
              id: createSeasonDto.cropTypeId
            }
          }


        }
      });
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async findAll() {
    try {
      return await this.databaseService.season.findMany({})
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async findAllByCropTypeId(cropTypeId: string) {
    try {
      return await this.databaseService.season.findMany({
        where: {
          croType: {
            id: cropTypeId
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async findAllByFarmerId(farmerId: string) {
    try {
      return await this.databaseService.season.findMany({
        where: {
          farmer: {
            id: farmerId
          }

        },
        include: {
          croType: true
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async findAllByFarmerIdAndCropTypeId(farmerId: string, cropTypeId: string) {
    try {
      return await this.databaseService.season.findMany({
        where: {
          croType: {
            id: cropTypeId
          },
          farmer: {
            id: farmerId
          }

        },
        include: {
          croType: true
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.season.findUnique({
        where: {
          id
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async update(id: string, updateSeasonDto: UpdateSeasonDto) {
    try {
      return await this.databaseService.season.update({
        where: {
          id
        }, data: {
          name: updateSeasonDto.name,
          plantationArea: updateSeasonDto.plantationArea,
          seeds: updateSeasonDto.seeds,
          produceHarvested: updateSeasonDto.produceHarvested,
          expectedYield: updateSeasonDto.expectedYield,
          startDate: updateSeasonDto.startDate,
          endDate: updateSeasonDto.endDate,
          seasonStatus: updateSeasonDto.status,

        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.season.delete({
        where: {
          id
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
}
