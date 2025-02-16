import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { DatabaseService } from '../database/database.service';
import { connect } from 'http2';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { LocationService } from 'src/location/location.service';
import { UsersService } from 'src/users/users.service';
import { CooperativeType, SeasonStatus } from '@prisma/client';
import { CreateCooperativeFarmerDto } from './dto/create-farmer-cooperative';
import { FarmerService } from 'src/farmer/farmer.service';


@Injectable()
export class CooperativeService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService, private readonly userServcice: UsersService, private readonly farmerService: FarmerService) { }

  async create(createCooperativeDto: CreateCooperativeDto) {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "COOPERATIVE_MANAGER"
        }
      });
      let user = await this.userServcice.create({ roleId: role.id, ...createCooperativeDto.managerDto });
      return await this.databaseService.cooperative.create({
        data: {
          name: createCooperativeDto.name,
          registrationNumber: createCooperativeDto.registrationNumber,
          telephone: createCooperativeDto.telephone,
          membersNumber: createCooperativeDto.membersNumber,
          type: createCooperativeDto.cooperativeType,
          Location: {
            connect: {
              id: createCooperativeDto.locationId,
            },
          },
          cooperativeManager: {
            connect: {
              id: user.id
            }
          }
        }
      })



    } catch (error) {
      throw new BadRequestException('Error creating cooperative ', error);
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
  async findAllBySType(cooperativeType: CooperativeType) {
    try {
      return await this.databaseService.cooperative.findMany({
        where: {
          type: cooperativeType
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperatives');
    }
  }
  async findAllCooperativesByLocationAndType(locationId: number, type: CooperativeType) {
    try {
      return await this.databaseService.cooperative.findMany({
        where: {
          locationId: {
            in: await this.locationService.getAllChildrenLocations(locationId)
          },
          type: type
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperatives');
    }
  }
  async findAllCooperativeCrops(cooperativeId: string) {
    try {
      return await this.databaseService.crop.findMany({
        where: {
          cropType: {
            some: {
              cropFarmerRegistrations: {
                some: {
                  farmer: {
                    cooperativeId: cooperativeId
                  }
                }
              }
            }

          }
        },
        include: {
          cropType: true
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative crops');
    }
  }
  async findAllCooperativeAnimals(cooperativeId: string) {
    try {
      return await this.databaseService.animal.findMany({
        where: {
          animalFarmerRegistrations: {
            some: {
              farmer: {
                cooperativeId
              }
            }
          }
        },
        include: {
          breeds: true
        }
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative animals');
    }
  }
  async findAllCooperativeCropsProduceAndArea(cooperativeId: string) {
    try {
      const croptypesData = await this.databaseService.cropType.findMany({
        where: {
          seasons: {
            some: {
              farmer: {
                cooperativeId,
              },
              seasonStatus: SeasonStatus.ENDED
            },
          },
        },
        select: {
          crop: {
            select: {
              name: true
            }
          },
          name: true,
          seasons: {
            where: {
              farmer: {
                cooperativeId,
              },
            },
            select: {
              produceHarvested: true,
              plantationArea: true,
              farmerId: true,
              seeds: true
            },
          },
          cropFarmerRegistrations: {
            where: {
              farmer: {
                cooperativeId,
              },
            },
            select: {
              farmerId: true,
              cropFertilizerFarmerRegistrations: {
                select: {
                  amount: true,
                  measurement: true,
                  feterlizer: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return croptypesData.map((croptype) => {
        // Calculate existing totals
        const produce = croptype.seasons.reduce((sum, season) => {
          return sum + (Number(season.produceHarvested) || 0);
        }, 0);

        const area = croptype.seasons.reduce((sum, season) => {
          return sum + (Number(season.plantationArea) || 0);
        }, 0);

        const seeds = croptype.seasons.reduce((sum, season) => {
          return sum + (Number(season.seeds) || 0);
        }, 0);

        // Get unique farmers count
        const uniqueFarmers = new Set(
          croptype.seasons.map((season) => season.farmerId)
        );

        // Calculate fertilizer usage
        const fertilizerUsage = new Map(); // To store fertilizer totals
        const fertilizerFarmers = new Map(); // To store farmers using each fertilizer

        croptype.cropFarmerRegistrations.forEach((registration) => {
          registration.cropFertilizerFarmerRegistrations.forEach((fertReg) => {
            const fertilizerId = fertReg.feterlizer.id;
            const fertilizerName = fertReg.feterlizer.name;
            const amount = Number(fertReg.amount) || 0;

            // Update total amount for this fertilizer
            if (!fertilizerUsage.has(fertilizerId)) {
              fertilizerUsage.set(fertilizerId, {
                name: fertilizerName,
                totalAmount: 0,
                measurement: fertReg.measurement
              });
            }
            fertilizerUsage.get(fertilizerId).totalAmount += amount;

            // Update farmers using this fertilizer
            if (!fertilizerFarmers.has(fertilizerId)) {
              fertilizerFarmers.set(fertilizerId, new Set());
            }
            fertilizerFarmers.get(fertilizerId).add(registration.farmerId);
          });
        });

        // Convert fertilizer usage maps to arrays for the response
        const fertilizers = Array.from(fertilizerUsage.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          totalAmount: data.totalAmount,
          measurement: data.measurement,
          farmersCount: fertilizerFarmers.get(id).size
        }));

        return {
          cropName: croptype.crop.name,
          cropTypeName: croptype.name,
          totalProduce: produce,
          plantationArea: area,
          totalFarmers: uniqueFarmers.size,
          totalInputSeeds: seeds,
          fertilizers
        };
      });
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative crops produce and area');
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

  async assignCreateFarmerToCooperative(assignFarmerToCooperativeDto: CreateCooperativeFarmerDto) {
    try {
      for (let farmer of assignFarmerToCooperativeDto.farmers) {
        let createdFarmer = await this.farmerService.registerFarmer(farmer);

        await this.databaseService.cooperative.update({
          where: { id: assignFarmerToCooperativeDto.cooperativeId },
          data: {
            farmers: {
              connect: {
                id: createdFarmer.id
              },
            },
          },
        });

      }

    } catch (e) {
      throw e
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