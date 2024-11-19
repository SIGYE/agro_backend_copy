import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { DatabaseService } from '../database/database.service';
import { connect } from 'http2';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { LocationService } from 'src/location/location.service';
import { AssignCropToCooperativeDto } from './dto/assignCooperativeCrop.dto';
import { AssignAnimalToCooperativeDto } from './dto/assignCooperativeAnimals.dto';
import { UpdateCropCooperativeDto } from './dto/updateCropCooperative.dto';
import { UpdateAnimalCooperativeDto } from './dto/updateAnimalCooperative.dto';


@Injectable()
export class CooperativeService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService) { }

  async create(createCooperativeDto: CreateCooperativeDto) {
    try {
      let cooperative = await this.databaseService.cooperative.create({
        data: {
          name: createCooperativeDto.name,
          registrationNumber: createCooperativeDto.registrationNumber,
          telephone: createCooperativeDto.telephone,
          membersNumber: createCooperativeDto.membersNumber,
          Location: {
            connect: {
              id: createCooperativeDto.locationId,
            },
          },
        }
      })
      // Assign crops to Cooperative if cropsId is present
      if (createCooperativeDto.crops) {
        for (let crop of createCooperativeDto.crops) {
          let cropCooperative = await this.databaseService.cooperativeCropRegistration.create({
            data: {
              plantationArea: crop.plantationArea,
              seeds: crop.seeds,
              produceHarvested: crop.produceHarvested,
              cooperative: {
                connect: {
                  id: cooperative.id
                }
              },
              crop: {
                connect: {
                  id: crop.cropsId
                }
              }
            }
          })
          for (let fertilizer of crop.fertilisers) {
            await this.databaseService.cropFertilizerCooperativeRegistration.create({
              data: {
                fertilizerId: fertilizer.fertiliserId,
                cooperativeCropRegistrationId: cropCooperative.id,
                amount: fertilizer.amountOfFertilizer,
                measurement: crop.measurementUnit
              }
            })

          }
        }
      }
      // Assign animals to farmer if animalIds is present
      if (createCooperativeDto.animals) {
        for (let animal of createCooperativeDto.animals) {
          await this.databaseService.animalFarmerRegistration.create({
            data: {
              farmer: {
                connect: {
                  id: cooperative.id
                }
              },
              animal: {
                connect: {
                  id: animal.animalId
                }
              },
              totalNumber: animal.totalNumber,
              femaleNumber: animal.femaleNumber,
              maleNumber: animal.maleNumber


            }
          });
        }
      }
    } catch (error) {
      throw new BadRequestException('Error creating cooperative');
    }
  }

  async assignCropsToCooperative(assignCropsToCooperative: AssignCropToCooperativeDto) {
    try {
      let cooperative = await this.databaseService.cooperative.findUnique({
        where: {
          id: assignCropsToCooperative.cooperativeId
        }
      })
      for (let crop of assignCropsToCooperative.crops) {
        let cropCooperative = await this.databaseService.cooperativeCropRegistration.create({
          data: {
            plantationArea: crop.plantationArea,
            seeds: crop.seeds,
            produceHarvested: crop.produceHarvested,
            cooperative: {
              connect: {
                id: cooperative.id
              }
            },
            crop: {
              connect: {
                id: crop.cropsId
              }
            },
          }
        })
        for (let fertilizer of crop.fertilisers) {
          await this.databaseService.cropFertilizerCooperativeRegistration.create({
            data: {
              fertilizerId: fertilizer.fertiliserId,
              cooperativeCropRegistrationId: cropCooperative.id,
              amount: fertilizer.amountOfFertilizer,
              measurement: crop.measurementUnit
            }
          })
        }

      }
      return cooperative;

    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async assignAnimalsToCooperative(assignAnimalsToCooperative: AssignAnimalToCooperativeDto) {
    try {
      let cooperative = await this.databaseService.cooperative.findUnique({
        where: {
          id: assignAnimalsToCooperative.cooperativeId
        }
      });
      for (let animal of assignAnimalsToCooperative.animals) {
        await this.databaseService.cooperativeAnimalRegistration.create({
          data: {
            cooperative: {
              connect: {
                id: cooperative.id
              }
            },
            animal: {
              connect: {
                id: animal.animalId
              }
            },
            totalNumber: animal.totalNumber,
            femaleNumber: animal.femaleNumber,
            maleNumber: animal.maleNumber
          }
        });
      }
      return cooperative;

    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
  async updateCropCooperativeRegistration(id: string, updateCooperativeCropRegistrationDto: UpdateCropCooperativeDto) {
    try {
      return await this.databaseService.cooperativeCropRegistration.update({
        where: {
          id
        },
        data: {

          plantationArea: updateCooperativeCropRegistrationDto.plantationArea,
          seeds: updateCooperativeCropRegistrationDto.seeds,
          produceHarvested: updateCooperativeCropRegistrationDto.produceHarvested
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async updateAnimalCooperativeRegistration(id: string, updateCooperativeAnimalRegistrationDto: UpdateAnimalCooperativeDto) {
    try {
      return await this.databaseService.cooperativeAnimalRegistration.update({
        where: {
          id
        },
        data: {
          totalNumber: updateCooperativeAnimalRegistrationDto.totalNumber,
          femaleNumber: updateCooperativeAnimalRegistrationDto.femaleNumber,
          maleNumber: updateCooperativeAnimalRegistrationDto.maleNumber
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async findAll() {
    try {
      return await this.databaseService.cooperative.findMany();
    } catch (error) {
      throw new BadRequestException('Error fetching cooperatives');
    }
  }
  async findAllCooperativesByLocation(locationId: number) {
    try {
      return await this.databaseService.cooperative.findMany({
        where: {
          locationId: {
            in: await this.locationService.getAllChildrenLocations(locationId)
          }
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperatives');
    }
  }

  async findAllCooperativeCrops(cooperativeId: string) {
    try {
      return await this.databaseService.cooperativeCropRegistration.findMany({
        where: {
          cooperativeId
        },
        include: {
          crop: true
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative crops');
    }
  }
  async findAllCooperativeAnimals(cooperativeId: string) {
    try {
      return await this.databaseService.cooperativeAnimalRegistration.findMany({
        where: {
          cooperativeId
        },
        include: {
          animal: true
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative animals');
    }
  }


  async findOne(id: string) {
    try {
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id },
      });
      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${id} not found`);
      }
      return cooperative;
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative');
    }
  }

  async update(id: string, updateCooperativeDto: UpdateCooperativeDto) {
    try {
      return await this.databaseService.cooperative.update({
        where: { id },
        data: updateCooperativeDto,
      });
    } catch (error) {
      throw new BadRequestException('Error updating cooperative');
    }
  }
  async assignFarmersToCooperative(assignFarmersToCooperativeDto: AssignFarmersTOCooperative) {
    const { cooperativeId, farmers } = assignFarmersToCooperativeDto;

    try {
      // Check if the cooperative exists
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id: cooperativeId },
      });

      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
      }

      // Assign farmers to the cooperative
      return await this.databaseService.cooperative.update({
        where: { id: cooperativeId },
        data: {
          farmers: {
            connect: farmers.map(id => ({ id })),
          },
        },
      });
    } catch (error) {
      throw new BadRequestException('Error assigning farmers to cooperative');
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.cooperative.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException('Error deleting cooperative');
    }
  }
}