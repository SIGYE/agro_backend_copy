import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePestDto } from './dto/create-pest.dto';
import { UpdatePestDto } from './dto/update-pest.dto';
import { DatabaseService } from 'src/database/database.service';
import { PestType } from '@prisma/client';
import { AssignPestDto } from './dto/assign-pest.dto';


@Injectable()
export class PestsService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createPestsDto: CreatePestDto, userId: string) {
    try {
      return await this.databaseService.pest.create({
        data: {
          name: createPestsDto.name,
          medication: createPestsDto.medication,
          type: createPestsDto.pestType,
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
  async assignPests(assignPestsDto: AssignPestDto) {
    try {
      const pest = await this.databaseService.pest.findUnique({
        where: { id: assignPestsDto.pestId },
      });

      if (!pest) {
        throw new NotFoundException('Pests not found');
      }

      // Handle crop pest assignments
      if (assignPestsDto.crops && assignPestsDto.crops.length > 0 && pest.type == PestType.CROP) {
        // Verify all crop registrations exist
        const cropRegistrations = await this.databaseService.cropFarmerRegistration.findMany({
          where: {
            id: {
              in: assignPestsDto.crops
            }
          }
        });

        if (cropRegistrations.length !== assignPestsDto.crops.length) {
          throw new BadRequestException('Some crop registrations were not found');
        }

        // Update each crop registration individually to handle the relation
        await Promise.all(
          assignPestsDto.crops.map(cropRegId =>
            this.databaseService.season.update({
              where: { id: cropRegId },
              data: {
                pests: {
                  connect: {
                    id: pest.id
                  }
                }
              }
            })
          )
        );
      }

      // Handle animal pest assignments
      if (assignPestsDto.animals && assignPestsDto.animals.length > 0 && pest.type == PestType.LIVESTOCK) {
        // Verify all animal registrations exist
        const animalRegistrations = await this.databaseService.animalFarmerRegistration.findMany({
          where: {
            id: {
              in: assignPestsDto.animals
            }
          }
        });

        if (animalRegistrations.length !== assignPestsDto.animals.length) {
          throw new BadRequestException('Some animal registrations were not found');
        }

        // Update each animal registration individually to handle the relation
        await Promise.all(
          assignPestsDto.animals.map(animalRegId =>
            this.databaseService.liveStockRegistration.update({
              where: { id: animalRegId },
              data: {
                pests: {
                  connect: {
                    id: pest.id
                  }
                }
              }
            })
          )
        );
      }

      return {
        success: true,
        message: 'Pests assigned successfully',
        affectedCrops: assignPestsDto.crops?.length || 0,
        affectedAnimals: assignPestsDto.animals?.length || 0
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to assign pest: ' + error.message);
    }
  }

  async findAll() {
    try {
      return await this.databaseService.pest.findMany();
    } catch (e) {
      throw e;
    }
  }
  async findAllByType(type: PestType) {
    try {
      return await this.databaseService.pest.findMany({
        where: {
          type: type
        }

      })
    } catch (e) {
      throw e
    }
  }
  async findAllByTypeAndUserId(type: PestType, userId: string) {
    try {
      return await this.databaseService.pest.findMany({
        where: {
          type: type,
          createdBy: userId
        }
      })
    } catch (e) {
      throw e
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.pest.findUnique({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updatePestsDto: UpdatePestDto) {
    try {
      return await this.databaseService.pest.update({
        where: {
          id: id
        },
        data: {
          name: updatePestsDto.name
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.pest.delete({
        where: {
          id: id
        }
      });
    }
    catch (e) {
      throw e;
    }
  }
}
