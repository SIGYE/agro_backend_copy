import { Injectable } from '@nestjs/common';
import { CreateSeedStrainDto } from './dto/create-seed-strain.dto';
import { UpdateSeedStrainDto } from './dto/update-seed-strain.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SeedStrainService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(userId: string, createSeedStrainDto: CreateSeedStrainDto) {
    try {
      return await this.databaseService.seedStrain.create({
        data: {
          name: createSeedStrainDto.name,
          cropType: {
            connect: {
              id: createSeedStrainDto.cropTypeId
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
      return await this.databaseService.seedStrain.findMany({
        include: {
          cropType: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAllByCropType(cropTypeId: string) {
    try {
      return await this.databaseService.seedStrain.findMany({
        where: {
          cropTypeId: cropTypeId
        },
        include: {
          cropType: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.seedStrain.findUnique({
        where: {
          id: id
        },
        include: {
          cropType: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateSeedStrainDto: UpdateSeedStrainDto) {
    try {
      return await this.databaseService.seedStrain.update({
        where: {
          id: id
        },
        data: {
          name: updateSeedStrainDto.name,
          ...(updateSeedStrainDto.cropTypeId && {
            cropType: {
              connect: {
                id: updateSeedStrainDto.cropTypeId
              }
            }
          })
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.seedStrain.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}