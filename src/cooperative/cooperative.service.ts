import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { DatabaseService } from '../database/database.service';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { LocationService } from 'src/location/location.service';
import { UsersService } from 'src/users/users.service';
import { CooperativeType, SeasonStatus } from '@prisma/client';
import { CreateCooperativeFarmerDto } from './dto/create-farmer-cooperative';
import { FarmerService } from 'src/farmer/farmer.service';


@Injectable()
export class CooperativeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly locationService: LocationService,
    private readonly userServcice: UsersService,
    private readonly farmerService: FarmerService
  ) { }

  async create(createCooperativeDto: CreateCooperativeDto) {
    try {
      return await this.databaseService.$transaction(async (prisma) => {
        // Get the cooperative manager role
        let role = await prisma.role.findFirst({
          where: {
            name: "COOPERATIVE_MANAGER"
          }
        });

        // Create the manager user
        let user = await this.userServcice.create({
          roleId: role.id,
          ...createCooperativeDto.managerDto
        });

        // Create the cooperative
        const cooperative = await prisma.cooperative.create({
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
        });

        // Register crops if provided in the DTO
        if (createCooperativeDto.crops && createCooperativeDto.crops.length > 0) {
          for (const crop of createCooperativeDto.crops) {
            await prisma.cooperativeCropRegistration.create({
              data: {
                cooperativeId: cooperative.id,
                cropTypeId: crop.cropTypesId
              }
            });
          }
        }

        return cooperative;
      });
    } catch (error) {
      throw new BadRequestException('Error creating cooperative ', error);
    }
  }

  async findAll() {
    try {
      return await this.databaseService.cooperative.findMany({
        include: {
          cooperativeCropRegistrations: {
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          },
          Location: true,
          cooperativeManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true
            }
          }
        }
      });
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
      // First check for directly registered crops via CooperativeCropRegistration
      const directCrops = await this.databaseService.cooperativeCropRegistration.findMany({
        where: {
          cooperativeId: cooperativeId
        },
        include: {
          cropType: {
            include: {
              crop: true
            }
          }
        }
      });

      // If direct crops exist, return those
      if (directCrops.length > 0) {
        const crops = await this.databaseService.crop.findMany({
          where: {
            cropType: {
              some: {
                id: {
                  in: directCrops.map(reg => reg.cropTypeId)
                }
              }
            }
          },
          include: {
            cropType: {
              where: {
                id: {
                  in: directCrops.map(reg => reg.cropTypeId)
                }
              }
            }
          }
        });

        return crops;
      }

      // Otherwise, fall back to getting crops via farmers
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
              seeds: true,
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
                }
              }
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

        croptype.seasons.forEach((registration) => {
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
        include: {
          cooperativeCropRegistrations: {
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          },
          farmers: {
            take: 10
          },
          Location: true,
          cooperativeManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true
            }
          }
        }
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
      return await this.databaseService.$transaction(async (prisma) => {
        // Check if the cooperative exists
        const cooperative = await prisma.cooperative.findUnique({
          where: { id: cooperativeId },
          include: {
            cooperativeCropRegistrations: true
          }
        });

        if (!cooperative) {
          throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
        }

        // Assign farmers to the cooperative
        const updatedCooperative = await prisma.cooperative.update({
          where: { id: cooperativeId },
          data: {
            farmers: {
              connect: farmers.map(id => ({ id })),
            },
          },
        });

        // Get all crop types registered to this cooperative
        const cooperativeCrops = cooperative.cooperativeCropRegistrations || [];

        // For each farmer, register them with each of the cooperative's crops
        const inheritedCropsResults = [];

        if (cooperativeCrops.length > 0) {
          for (const farmerId of farmers) {
            const farmerCropsInherited = [];

            for (const cooperativeCrop of cooperativeCrops) {
              // Check if farmer is already registered with this crop type
              const existingRegistration = await prisma.cropFarmerRegistration.findFirst({
                where: {
                  farmerId: farmerId,
                  cropTypeId: cooperativeCrop.cropTypeId
                }
              });

              // Only create registration if it doesn't exist
              if (!existingRegistration) {
                await prisma.cropFarmerRegistration.create({
                  data: {
                    farmerId: farmerId,
                    cropTypeId: cooperativeCrop.cropTypeId
                  }
                });

                // Get crop type details
                const cropType = await prisma.cropType.findUnique({
                  where: { id: cooperativeCrop.cropTypeId },
                  include: { crop: true }
                });

                if (cropType) {
                  farmerCropsInherited.push({
                    cropTypeId: cropType.id,
                    cropTypeName: cropType.name,
                    cropName: cropType.crop.name
                  });
                }
              }
            }

            inheritedCropsResults.push({
              farmerId,
              inheritedCrops: farmerCropsInherited
            });
          }
        }

        return {
          cooperative: updatedCooperative,
          farmersInheritedCrops: inheritedCropsResults
        };
      });
    } catch (error) {
      throw new BadRequestException('Error assigning farmers to cooperative', error);
    }
  }

  async assignCreateFarmerToCooperative(assignFarmerToCooperativeDto: CreateCooperativeFarmerDto) {
    try {
      return await this.databaseService.$transaction(async (prisma) => {
        // Get cooperative details including crops
        const cooperative = await prisma.cooperative.findUnique({
          where: { id: assignFarmerToCooperativeDto.cooperativeId },
          include: {
            cooperativeCropRegistrations: {
              include: {
                cropType: {
                  include: {
                    crop: true
                  }
                }
              }
            }
          }
        });

        if (!cooperative) {
          throw new NotFoundException(`Cooperative with ID ${assignFarmerToCooperativeDto.cooperativeId} not found`);
        }

        const results = [];

        for (let farmer of assignFarmerToCooperativeDto.farmers) {
          // Create the farmer
          const createdFarmer = await this.farmerService.registerFarmer(farmer);

          // Add farmer to cooperative
          await prisma.farmer.update({
            where: { id: createdFarmer.id },
            data: {
              cooperative: {
                connect: { id: assignFarmerToCooperativeDto.cooperativeId }
              }
            }
          });

          // Register farmer with cooperative crops
          const cooperativeCrops = cooperative.cooperativeCropRegistrations || [];
          const inheritedCrops = [];

          if (cooperativeCrops.length > 0) {
            for (const cooperativeCrop of cooperativeCrops) {
              await prisma.cropFarmerRegistration.create({
                data: {
                  farmerId: createdFarmer.id,
                  cropTypeId: cooperativeCrop.cropTypeId
                }
              });

              inheritedCrops.push({
                cropTypeId: cooperativeCrop.cropTypeId,
                cropTypeName: cooperativeCrop.cropType.name,
                cropName: cooperativeCrop.cropType.crop.name
              });
            }
          }

          results.push({
            farmer: createdFarmer,
            inheritedCrops: inheritedCrops
          });
        }

        return results;
      });
    } catch (e) {
      throw e;
    }
  }

  async addCropToCooperative(cooperativeId: string, cropTypeId: string) {
    try {
      return await this.databaseService.$transaction(async (prisma) => {
        // Check if this crop is already registered with the cooperative
        const existingRegistration = await prisma.cooperativeCropRegistration.findFirst({
          where: {
            cooperativeId: cooperativeId,
            cropTypeId: cropTypeId
          }
        });

        // If already registered, just return the existing registration
        if (existingRegistration) {
          return {
            registration: existingRegistration,
            newlyRegistered: false,
            farmersUpdated: 0
          };
        }

        // Register the new crop with the cooperative
        const registration = await prisma.cooperativeCropRegistration.create({
          data: {
            cooperativeId: cooperativeId,
            cropTypeId: cropTypeId
          },
          include: {
            cropType: {
              include: {
                crop: true
              }
            }
          }
        });

        // Get all farmers in this cooperative
        const farmers = await prisma.farmer.findMany({
          where: { cooperativeId: cooperativeId }
        });

        // Register all farmers with this crop type
        let farmersUpdated = 0;
        const updatedFarmers = [];

        for (const farmer of farmers) {
          // Check if farmer is already registered with this crop type
          const existingFarmerRegistration = await prisma.cropFarmerRegistration.findFirst({
            where: {
              farmerId: farmer.id,
              cropTypeId: cropTypeId
            }
          });

          // Only create registration if it doesn't exist
          if (!existingFarmerRegistration) {
            await prisma.cropFarmerRegistration.create({
              data: {
                farmerId: farmer.id,
                cropTypeId: cropTypeId
              }
            });

            updatedFarmers.push(farmer.id);
            farmersUpdated++;
          }
        }

        return {
          registration,
          newlyRegistered: true,
          farmersUpdated,
          updatedFarmers
        };
      });
    } catch (error) {
      throw new BadRequestException('Error adding crop to cooperative', error);
    }
  }

  async removeCropFromCooperative(cooperativeId: string, cropTypeId: string, cascadeToFarmers: boolean = false) {
    try {
      return await this.databaseService.$transaction(async (prisma) => {
        // Check if this crop is registered with the cooperative
        const existingRegistration = await prisma.cooperativeCropRegistration.findFirst({
          where: {
            cooperativeId: cooperativeId,
            cropTypeId: cropTypeId
          }
        });

        if (!existingRegistration) {
          throw new NotFoundException(`Crop type with ID ${cropTypeId} is not registered with cooperative ${cooperativeId}`);
        }

        // Remove the crop registration
        await prisma.cooperativeCropRegistration.delete({
          where: {
            id: existingRegistration.id
          }
        });

        let farmersAffected = 0;

        // If cascadeToFarmers is true, also remove the crop registration from all farmers in cooperative
        if (cascadeToFarmers) {
          const result = await prisma.cropFarmerRegistration.deleteMany({
            where: {
              cropTypeId: cropTypeId,
              farmer: {
                cooperativeId: cooperativeId
              }
            }
          });

          farmersAffected = result.count;
        }

        return {
          removed: true,
          farmersAffected: farmersAffected
        };
      });
    } catch (error) {
      throw new BadRequestException('Error removing crop from cooperative', error);
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