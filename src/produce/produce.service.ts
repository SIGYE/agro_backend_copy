import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProduceDto } from './dto/create-produce.dto';
import { UpdateProduceDto } from './dto/update-produce.dto';
import { DatabaseService } from 'src/database/database.service';
import { LocationService } from 'src/location/location.service';

@Injectable()
export class ProduceService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService) { }
  async create(createProduceDto: CreateProduceDto) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.create({
        data: {
          animalProduct: {
            connect: {
              id: createProduceDto.animalProductId
            }
          },
          animalFarmerRegistration: {
            connect: {
              id: createProduceDto.LivestockRegistrationId
            }
          },
          amount: createProduceDto.amount,
          measurements: createProduceDto.measurements
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async findAll() {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.findMany({
        include: {
          animalProduct: {
            select: {
              name: true
            }
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async findAllByLivestockRegistrationId(livestockRegistrationId: string) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.findMany({
        where: {
          animalFarmerRegistration: {
            id: livestockRegistrationId
          }
        },
        include: {
          animalProduct: {
            select: {
              name: true
            }
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async findAllByAnimalProductId(animalProductId: string) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.findMany({
        where: {
          animalProduct: {
            id: animalProductId
          }
        },
        include: {
          animalProduct: {
            select: {
              name: true
            }
          }
        }
      })

    } catch (e) {
      throw new BadRequestException(e.message)
    }

  }
  async getAnimalProduceStatistics(animalProductId?: string, locationId?: number, cooperativeId?: string) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
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

      // Fetch animals with related produce data
      const animals = await this.databaseService.animal.findMany({
        include: {
          animalProducts: {
            where: animalProductId ? { id: animalProductId } : undefined,
            include: {
              farmerAnimalRegistrationProduces: {
                include: {
                  animalFarmerRegistration: {
                    include: {
                      animalFarmerRegistration: {
                        include: {
                          farmer: {
                            include: {
                              cooperative: true
                            }
                          }
                        }
                      }

                    }
                  }
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
                    where: animalProductId ? { animalProductId: animalProductId } : undefined,
                    include: {
                      animalProduct: true,
                      animalFarmerRegistration: {
                        include: {
                          animalFarmerRegistration: {
                            include: {
                              farmer: {
                                include: {
                                  cooperative: true
                                }
                              }
                            }
                          }

                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const result = animals.map(animal => {
        // Filter registrations based on location and cooperative
        const filteredRegistrations = animal.animalFarmerRegistrations.filter(registration => {
          const meetsLocationCriteria = locationIds.length === 0 ||
            (registration.farmer.cooperative &&
              locationIds.includes(registration.farmer.cooperative.locationId));

          const meetsCooperativeCriteria = !cooperativeId ||
            registration.farmer.cooperativeId === cooperativeId;

          return meetsLocationCriteria && meetsCooperativeCriteria;
        });

        // Process produce data for each product using filtered registrations
        const productStats = animal.animalProducts.map(product => {
          // Get all produces for this product across filtered registrations
          const allProduces = filteredRegistrations
            .flatMap(reg => reg.liveStockRegistrations)
            .flatMap(livestock => livestock.farmerAnimalRegistrationProduce)
            .filter(produce => produce.animalProductId === product.id);

          // Group produces by measurement
          const produceByMeasurement = allProduces.reduce((acc, produce) => {
            if (!acc[produce.measurements]) {
              acc[produce.measurements] = {
                totalAmount: 0,
                farmerCount: new Set(),
                monthlyStats: {},
                cooperativeStats: new Map() // Track by cooperative
              };
            }

            acc[produce.measurements].totalAmount += produce.amount;
            acc[produce.measurements].farmerCount.add(produce.animalFarmerRegistration.animalFarmerRegistration.farmerId);

            // Add monthly statistics
            const month = new Date(produce.createdAt).toISOString().slice(0, 7);
            if (!acc[produce.measurements].monthlyStats[month]) {
              acc[produce.measurements].monthlyStats[month] = 0;
            }
            acc[produce.measurements].monthlyStats[month] += produce.amount;

            // Track cooperative statistics
            const cooperative = produce.animalFarmerRegistration.animalFarmerRegistration.farmer.cooperative;
            if (cooperative) {
              const coopKey = `${cooperative.id}-${cooperative.type}`;
              if (!acc[produce.measurements].cooperativeStats.has(coopKey)) {
                acc[produce.measurements].cooperativeStats.set(coopKey, {
                  cooperativeId: cooperative.id,
                  cooperativeName: cooperative.name,
                  cooperativeType: cooperative.type,
                  amount: 0,
                  farmerCount: new Set()
                });
              }
              const coopStats = acc[produce.measurements].cooperativeStats.get(coopKey);
              coopStats.amount += produce.amount;
              coopStats.farmerCount.add(produce.animalFarmerRegistration.animalFarmerRegistration.farmerId);
            }

            return acc;
          }, {});

          // Transform the grouped data
          const measurementStats = Object.entries(produceByMeasurement).map(([measurement, stats]: any) => ({
            measurement,
            totalAmount: stats.totalAmount,
            uniqueFarmers: stats.farmerCount.size,
            monthlyBreakdown: Object.entries(stats.monthlyStats)
              .map(([month, amount]) => ({
                month,
                amount
              }))
              .sort((a, b) => a.month.localeCompare(b.month)),
            cooperativeBreakdown: Array.from(stats.cooperativeStats.values())
              .map((coopStat: any) => ({
                cooperativeId: coopStat.cooperativeId,
                cooperativeName: coopStat.cooperativeName,
                cooperativeType: coopStat.cooperativeType,
                amount: coopStat.amount,
                farmerCount: coopStat.farmerCount.size
              }))
          }));

          return {
            productId: product.id,
            productName: product.name,
            totalProducingFarmers: new Set(
              allProduces.map(produce => produce.animalFarmerRegistration.animalFarmerRegistration.farmerId)
            ).size,
            measurementStats,
            summary: {
              totalMeasurements: measurementStats.length,
              totalAmount: measurementStats.reduce((sum, stat) => sum + stat.totalAmount, 0)
            }
          };
        });

        return {
          id: animal.id,
          name: animal.name,
          totalFarmers: filteredRegistrations.length,
          productStatistics: productStats,
          summary: {
            totalProducts: productStats.length,
            totalProducingFarmers: new Set(
              filteredRegistrations
                .flatMap(reg => reg.liveStockRegistrations)
                .flatMap(livestock => livestock.farmerAnimalRegistrationProduce)
                .map(produce => produce.animalFarmerRegistration.animalFarmerRegistration.farmerId)
            ).size
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

  async findAllByFarmer(farmerId: string) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.findMany({
        where: {
          animalFarmerRegistration: {
            animalFarmerRegistration: {
              farmerId
            }


          }
        },
        include: {
          animalProduct: {
            select: {
              name: true
            }
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }



  async findOne(id: string) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.findUnique({
        where: {
          id
        },
        include: {
          animalProduct: {
            select: {
              name: true
            }
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async update(id: string, updateProduceDto: UpdateProduceDto) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.update({
        where: {
          id
        },
        data: {
          amount: updateProduceDto.amount,
          measurements: updateProduceDto.measurements
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }


  async remove(id: string) {
    try {
      return await this.databaseService.farmerAnimalRegistrationProduce.delete({
        where: {
          id
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
}
