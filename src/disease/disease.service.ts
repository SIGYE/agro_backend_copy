import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDiseaseDto } from './dto/create-disease.dto';
import { UpdateDiseaseDto } from './dto/update-disease.dto';
import { DatabaseService } from 'src/database/database.service';
import { DiseaseType } from '@prisma/client';
import { AssignDiseaseDto } from './dto/assign-disease.dto';

@Injectable()
export class DiseaseService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createDiseaseDto: CreateDiseaseDto, userId: string) {
    try {
      return await this.databaseService.disease.create({
        data: {
          name: createDiseaseDto.name,
          medication: createDiseaseDto.medication,
          type: createDiseaseDto.diseaseType,
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
  async assignDisease(assignDiseaseDto: AssignDiseaseDto) {
    try {
      const disease = await this.databaseService.disease.findUnique({
        where: { id: assignDiseaseDto.diseaseId },
      });

      if (!disease) {
        throw new NotFoundException('Disease not found');
      }

      // Handle crop disease assignments
      if (assignDiseaseDto.crops && assignDiseaseDto.crops.length > 0 && disease.type == DiseaseType.CROP) {
        // Verify all crop registrations exist
        const cropRegistrations = await this.databaseService.cropFarmerRegistration.findMany({
          where: {
            id: {
              in: assignDiseaseDto.crops
            }
          }
        });

        if (cropRegistrations.length !== assignDiseaseDto.crops.length) {
          throw new BadRequestException('Some crop registrations were not found');
        }

        // Update each crop registration individually to handle the relation
        await Promise.all(
          assignDiseaseDto.crops.map(cropRegId =>
            this.databaseService.season.update({
              where: { id: cropRegId },
              data: {
                diseases: {
                  connect: {
                    id: disease.id
                  }
                }
              }
            })
          )
        );
      }

      // Handle animal disease assignments
      if (assignDiseaseDto.animals && assignDiseaseDto.animals.length > 0 && disease.type == DiseaseType.LIVESTOCK) {
        // Verify all animal registrations exist
        const animalRegistrations = await this.databaseService.animalFarmerRegistration.findMany({
          where: {
            id: {
              in: assignDiseaseDto.animals
            }
          }
        });

        if (animalRegistrations.length !== assignDiseaseDto.animals.length) {
          throw new BadRequestException('Some animal registrations were not found');
        }

        // Update each animal registration individually to handle the relation
        await Promise.all(
          assignDiseaseDto.animals.map(animalRegId =>
            this.databaseService.animal.update({
              where: { id: animalRegId },
              data: {
                diseases: {
                  connect: {
                    id: disease.id
                  }
                }
              }
            })
          )
        );
      }

      return {
        success: true,
        message: 'Disease assigned successfully',
        affectedCrops: assignDiseaseDto.crops?.length || 0,
        affectedAnimals: assignDiseaseDto.animals?.length || 0
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to assign disease: ' + error.message);
    }
  }

  async findAll() {
    try {
      return await this.databaseService.disease.findMany();
    } catch (e) {
      throw e;
    }
  }
  async findAllByType(type: DiseaseType) {
    try {
      return await this.databaseService.disease.findMany({
        where: {
          type: type
        }

      })
    } catch (e) {
      throw e
    }
  }
  async findAllByTypeAndUserId(type: DiseaseType, userId: string) {
    try {
      return await this.databaseService.disease.findMany({
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
      return await this.databaseService.disease.findUnique({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateDiseaseDto: UpdateDiseaseDto) {
    try {
      return await this.databaseService.disease.update({
        where: {
          id: id
        },
        data: {
          name: updateDiseaseDto.name
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.disease.delete({
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
