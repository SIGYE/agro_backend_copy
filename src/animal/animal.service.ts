import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { DatabaseService } from 'src/database/database.service';
import * as XLSX from 'xlsx';
import { CreateAnimalProductDto } from './dto/create-animal-product.dto';
import { LocationService } from 'src/location/location.service';


@Injectable()
export class AnimalService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly locationService: LocationService) {

  }
  async create(createAnimalDto: CreateAnimalDto, userId: string) {
    try {
      console.log('createAnimalDto : ' + createAnimalDto)
      return await this.dataBaseService.animal.create({
        data: {
          name: createAnimalDto.name,
          createdBy: userId
        }
      })
    } catch (error) {
      console.log('error : ' + error)
      throw new BadRequestException(error.message);
    }
  }
  async createAnimalProduct(createAnimalProduct: CreateAnimalProductDto) {
    try {
      return await this.dataBaseService.animalProduct.create({
        data: {
          name: createAnimalProduct.name,
          animal: {
            connect: {
              id: createAnimalProduct.animalId
            }
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }


  async findAll() {
    try {
      return await this.dataBaseService.animal.findMany();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async findAllAnimalProducts(animalId: string) {
    try {
      return await this.dataBaseService.animalProduct.findMany({
        where: {
          animalId: animalId
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async getAnimalCardData(locationId?: number, cooperativeId?: string) {
    try {
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.dataBaseService.location.findUnique({
          where: {
            id: locationId
          }
        });
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId);
        }
      }
      if (cooperativeId) {
        const cooperative = await this.dataBaseService.cooperative.findUnique({
          where: {
            id: cooperativeId
          }
        });
        if (!cooperative) {
          throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
        }
      }
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};
      const cooperativeQuery = cooperativeId
        ? {
          cooperativeId: cooperativeId
        } : {}
      let totalAnimals = await this.dataBaseService.animal.count({
        where: {
          animalFarmerRegistrations: {
            some: {
              farmer: {
                user: {
                  ...locationQuery
                },
                ...cooperativeQuery

              }
            }
          }
        }
      })
      let totalBreed = await this.dataBaseService.breed.count({
        where: {
          animal: {
            animalFarmerRegistrations: {
              some: {
                farmer: {
                  user: {
                    ...locationQuery
                  },
                  ...cooperativeQuery
                }
              }
            }
          }
        }
      })

      return {
        totalBreed,
        totalAnimals
      }


    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getAnimalFarmersData(locationId?: number, cooperativeId?: string) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.dataBaseService.location.findUnique({
          where: {
            id: locationId
          }
        });
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId);
        }
      }

      // Build query conditions
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};
      const cooperativeQuery = cooperativeId ? { cooperativeId } : {};

      // Get animals with their farmer registrations
      const animals = await this.dataBaseService.animal.findMany({
        include: {
          animalFarmerRegistrations: {
            include: {
              farmer: {
                include: {
                  cooperative: true
                }
              }
            }
          }
        }
      });

      // Process and transform the data
      const result = animals.map(animal => {
        // Filter farmer registrations based on location and cooperative
        const filteredRegistrations = animal.animalFarmerRegistrations.filter(registration => {
          const meetsLocationCriteria = locationIds.length === 0 ||
            (registration.farmer.cooperative &&
              locationIds.includes(registration.farmer.cooperative.locationId));

          const meetsCooperativeCriteria = !cooperativeId ||
            registration.farmer.cooperativeId === cooperativeId;

          return meetsLocationCriteria && meetsCooperativeCriteria;
        });

        // Calculate totals
        const totalFarmers = filteredRegistrations.length;
        const totalAnimals = filteredRegistrations.reduce((sum, reg) => sum + reg.totalNumber, 0);
        const totalMales = filteredRegistrations.reduce((sum, reg) => sum + reg.maleNumber, 0);
        const totalFemales = filteredRegistrations.reduce((sum, reg) => sum + reg.femaleNumber, 0);

        return {
          id: animal.id,
          name: animal.name,
          statistics: {
            totalFarmers,
            totalAnimals,
            totalMales,
            totalFemales
          }
        };
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
  async getAnimalCompleteStatistics(locationId?: number, cooperativeId?: string) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.dataBaseService.location.findUnique({
          where: {
            id: locationId
          }
        });
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId);
        }
      }

      const animals = await this.dataBaseService.animal.findMany({
        include: {
          breeds: true,
          animalProducts: {
            include: {
              farmerAnimalRegistrationProduces: {
                include: {
                  animalFarmerRegistration: true
                }
              }
            }
          },
          animalFarmerRegistrations: {
            include: {
              farmer: {
                include: {
                  cooperative: true
                }
              },
              liveStockRegistrations: {
                include: {
                  farmerAnimalRegistrationProduce: {
                    include: {
                      animalProduct: true
                    }
                  },
                  breed: true
                }
              }
            }
          }
        }
      });

      const result = animals.map(animal => {
        // Filter farmer registrations based on location and cooperative
        const filteredRegistrations = animal.animalFarmerRegistrations.filter(registration => {
          const meetsLocationCriteria = locationIds.length === 0 ||
            (registration.farmer.cooperative &&
              locationIds.includes(registration.farmer.cooperative.locationId));

          const meetsCooperativeCriteria = !cooperativeId ||
            registration.farmer.cooperativeId === cooperativeId;

          return meetsLocationCriteria && meetsCooperativeCriteria;
        });

        // Calculate total breeds
        const totalBreeds = animal.breeds.length;

        // Calculate total farmers (from filtered registrations)
        const totalFarmers = filteredRegistrations.length;

        // Calculate products statistics using filtered registrations
        const productStats = animal.animalProducts.map(product => {
          const producesByMeasurement = {};

          // Get all produces for this product from filtered registrations
          const allProduces = filteredRegistrations.flatMap(registration =>
            registration.liveStockRegistrations.flatMap(livestock =>
              livestock.farmerAnimalRegistrationProduce.filter(produce =>
                produce.animalProductId === product.id
              )
            )
          );

          // Sum up amounts by measurement type
          allProduces.forEach(produce => {
            const measurement = produce.measurements;
            if (!producesByMeasurement[measurement]) {
              producesByMeasurement[measurement] = 0;
            }
            producesByMeasurement[measurement] += produce.amount;
          });

          return {
            productId: product.id,
            productName: product.name,
            totalProduceByMeasurement: Object.entries(producesByMeasurement).map(([measurement, amount]) => ({
              measurement,
              totalAmount: amount
            }))
          };
        });

        // Calculate breed statistics from filtered registrations
        const breedStats = animal.breeds.map(breed => {
          const totalLivestock = filteredRegistrations.reduce((sum, registration) =>
            sum + registration.liveStockRegistrations.filter(livestock =>
              livestock.breedId === breed.id
            ).length
            , 0);

          return {
            breedId: breed.id,
            breedName: breed.breedName,
            totalLivestock
          };
        });

        // Calculate additional livestock statistics
        const livestockStats = {
          totalLivestock: filteredRegistrations.reduce((sum, reg) =>
            sum + reg.liveStockRegistrations.length, 0),
          byPurpose: this.groupLivestockByPurpose(
            filteredRegistrations.flatMap(reg => reg.liveStockRegistrations)
          ),
          byAnimalState: this.groupLivestockByState(
            filteredRegistrations.flatMap(reg => reg.liveStockRegistrations)
          )
        };

        return {
          id: animal.id,
          name: animal.name,
          statistics: {
            totalBreeds,
            totalFarmers,
            breedStatistics: breedStats,
            productStatistics: productStats,
            livestockStatistics: livestockStats
          }
        };
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch animal complete statistics');
    }
  }

  // Helper methods for grouping livestock
  private groupLivestockByPurpose(livestock: any[]) {
    const purposeGroups = {};
    livestock.forEach(item => {
      if (!purposeGroups[item.purpose]) {
        purposeGroups[item.purpose] = 0;
      }
      purposeGroups[item.purpose]++;
    });
    return Object.entries(purposeGroups).map(([purpose, count]) => ({
      purpose,
      count
    }));
  }

  private groupLivestockByState(livestock: any[]) {
    const stateGroups = {};
    livestock.forEach(item => {
      if (!stateGroups[item.animalState]) {
        stateGroups[item.animalState] = 0;
      }
      stateGroups[item.animalState]++;
    });
    return Object.entries(stateGroups).map(([state, count]) => ({
      state,
      count
    }));
  }

  async findOne(id: string) {
    try {
      return await this.dataBaseService.animal.findUnique({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, updateAnimalDto: UpdateAnimalDto) {
    try {
      return await this.dataBaseService.animal.update({
        where: {
          id: id
        },
        data: {
          name: updateAnimalDto.name
        }
      });
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.dataBaseService.animal.delete({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async importAnimals(file: Express.Multer.File, userId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (assuming it's the header row)
    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        // Map the row to a userDto-like object based on the cell index
        let animalDto = {
          name: row[0],
          purpose: row[1]

        };


        await this.create(animalDto, userId) // Register vet with the custom object
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: row,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { success, failed, errors };
  }
  // async assignLivestockDisease(livestockId: string, diseaseId: string) {
  //   try {
  //     return await this.dataBaseService.livestock.update({
  //       where: {
  //         id: livestockId
  //       },
  //       data: {
  //         diseases: {
  //           connect: {
  //             id: diseaseId
  //           }
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     throw new BadRequestException(error.message);
  //   }
  // }
  async getAnimalsWithProductStats() {
    const animals = await this.dataBaseService.animal.findMany({
      include: {
        animalProducts: {
          include: {
            farmerAnimalRegistrationProduces: {
              select: {
                amount: true,
                measurements: true,
              },
            },
          },
        },
      },
    });

    // Process and aggregate production stats
    return animals.map((animal) => ({
      id: animal.id,
      name: animal.name,
      animalProducts: animal.animalProducts.map((product) => {
        const totalAmount = product.farmerAnimalRegistrationProduces.reduce(
          (sum, produce) => sum + produce.amount,
          0
        );

        return {
          id: product.id,
          name: product.name,
          totalAmount,
          measurements:
            product.farmerAnimalRegistrationProduces.length > 0
              ? product.farmerAnimalRegistrationProduces[0].measurements
              : null, // Assuming all measurements are the same for a product
        };
      }),
    }));
  }
  async getFarmersByProduct(productId: string) {
    // Fetch farmers who have registered animals producing this product
    const farmers = await this.dataBaseService.farmer.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, telephone: true },
        },
        cooperative: {
          select: { id: true, name: true, type: true },
        },
        animalFarmerRegistrations: {
          include: {
            liveStockRegistrations: {
              include: {
                farmerAnimalRegistrationProduce: {
                  where: { animalProductId: productId },
                  select: { amount: true, measurements: true },
                },
              },
            },
          },
        },
      },
    });

    // Organize farmers into two groups
    const farmersWithoutCoop = [];
    const cooperativesMap = new Map();

    farmers.forEach((farmer) => {
      const produceRecords = farmer.animalFarmerRegistrations.flatMap((afr) =>
        afr.liveStockRegistrations.flatMap((lsr) =>
          lsr.farmerAnimalRegistrationProduce,
        ),
      );

      if (produceRecords.length === 0) return; // Skip farmers without relevant products

      // Aggregate total amount and get measurement (assuming same measurement for a product)
      const totalAmount = produceRecords.reduce((sum, record) => sum + record.amount, 0);
      const measurement = produceRecords[0].measurements; // Taking measurement from the first record

      if (!farmer.cooperative) {
        // Farmers without a cooperative
        farmersWithoutCoop.push({
          name: farmer.user.firstName + " " + farmer.user.lastName,
          phoneNumber: farmer.user.telephone,
          totalAmount,
          measurement,
        });
      } else {
        // Grouping by cooperative
        if (!cooperativesMap.has(farmer.cooperative.id)) {
          cooperativesMap.set(farmer.cooperative.id, {
            name: farmer.cooperative.name,
            type: farmer.cooperative.type,
            farmers: [],
          });
        }
        cooperativesMap.get(farmer.cooperative.id).farmers.push({
          name: farmer.user.firstName + " " + farmer.user.lastName,
          phoneNumber: farmer.user.telephone,
          totalAmount,
          measurement,
        });
      }
    });

    return {
      farmersWithoutCooperative: farmersWithoutCoop,
      cooperatives: Array.from(cooperativesMap.values()),
    };
  }
}
