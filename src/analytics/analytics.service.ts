import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CooperativeType, SeasonStatus } from '@prisma/client'
import { DatabaseService } from 'src/database/database.service'
import { LocationService } from 'src/location/location.service'
import { UsersService } from 'src/users/users.service'
import { getMonthsArray } from 'src/utils/data.util'
import { AdminCardsDto } from './dto/adminCards.dto'
import { PaginationQueryDto } from 'src/pagination/pagination.dto'
export type CropAggregationType = {
  cropId: string;
  cropName: string;
  totalProduce: number;
  _count: number;
  cropTypes: {
    cropTypeId: string;
    cropTypeName: string;
    totalProduce: number;
    _count: number;
  }[];
}[]
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly locationService: LocationService,
    private readonly userService: UsersService,
  ) { }

  async getAgroCardAnalytics(locationId?: number) {
    if (locationId) {
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId },
        include: {
          childrenLocations: true,
        },
      })

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
    }
    try {
      const locationIds = locationId
        ? await this.locationService.getAllChildrenLocations(locationId)
        : []

      const locationQuery = locationId
        ? { locationId: { in: locationIds } }
        : {}
      //   select count farmers
      const totalFarmers = await this.databaseService.farmer.count({
        where: {
          user: { ...locationQuery },
        },
      })
      const totalCooperatives = await this.databaseService.cooperative.count({
        where: { ...locationQuery },
      })
      const totalCrops =
        await this.databaseService.cropFarmerRegistration.count({
          where: {
            farmer: {
              user: { ...locationQuery },
            },
          },
        })
      const records = await this.databaseService.season.findMany({
        where: {
          farmer: {
            user: {
              locationId: {
                in: locationIds
              }
            }
          }
        },
        select: {
          plantationArea: true
        }
      });

      // Convert `plantedArea` values to numbers and calculate the sum
      const totalPlantedArea = records.reduce((sum, record) => {
        const plantedAreaNumber = (record.plantationArea) || 0; // Convert string to number, defaulting to 0 if NaN
        return sum + plantedAreaNumber;
      }, 0);

      const cardData = {
        totalFarmers,
        totalCooperatives,
        totalCrops,
        totalPlantedArea,
      }
      return cardData
    } catch (error) {
      throw new Error(error)
    }
  }

  async getVetCardAnalytics(locationId?: number) {
    if (locationId) {
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId ?? 1 },
        include: {
          childrenLocations: true,
        },
      })

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
    }

    try {
      const locationIds = locationId
        ? await this.locationService.getAllChildrenLocations(locationId)
        : []
      const locationQuery = locationId
        ? { locationId: { in: locationIds } }
        : {}
      const totalVets = await this.databaseService.veterinary.count({
        where: {
          user: {
            ...locationQuery,
          },
        },
      })
      const totalAnimals =
        await this.databaseService.animalFarmerRegistration.count({
          where: {
            farmer: {
              user: { ...locationQuery },
            },
          },
        })

      const totalFarmers = await this.databaseService.farmer.count({
        where: {
          user: { ...locationQuery },
        },
      })

      const totalCooperatives = await this.databaseService.cooperative.count({
        where: { ...locationQuery },
      })

      const cardData = {
        totalVets,
        totalAnimals,
        totalFarmers,
        totalCooperatives,
      }
      return cardData
    } catch (error) {
      throw new Error(error)
    }
  }

  // async getAgroFarmerCrops(locationId?: number) {
  //   if (locationId) {
  //     const location = await this.databaseService.location.findUnique({
  //       where: { id: locationId },
  //       include: {
  //         childrenLocations: true,
  //       },
  //     })

  //     if (!location) {
  //       throw new NotFoundException(`Location with ID ${locationId} not found`)
  //     }
  //   }

  //   try {
  //     const locationIds = locationId
  //       ? await this.locationService.getAllChildrenLocations(locationId)
  //       : []

  //     const locationQuery = locationId
  //       ? { locationId: { in: locationIds } }
  //       : {}
  //     const farmerCrops =
  //       await this.databaseService.cropFarmerRegistration.groupBy({
  //         by: ['cropId'],
  //         where: {
  //           farmer: {
  //             user: { ...locationQuery },
  //           },
  //         },
  //         _count: {
  //           _all: true,
  //         },
  //         // _sum: {
  //         //   plantedArea: true,
  //         // },
  //       })

  //     const cropsWithDetails = await Promise.all(
  //       farmerCrops.map(async (crop) => {
  //         const cropDetails =
  //           await this.databaseService.cropFarmerRegistration.findFirst({
  //             where: { cropId: crop.cropId },
  //             include: {
  //               crop: true,
  //             },
  //           })
  //         return { ...cropDetails, count: crop._count._all }
  //         return {
  //           cropId: crop.cropId,
  //           cropName: cropDetails.crop.name,
  //           count: crop._count._all,
  //           totalPlantedArea: crop._sum.plantedArea,
  //           // Add any other fields you want from cropFarmerRegistration
  //           // For example:
  //           // plantingDate: cropDetails.plantingDate,
  //           // harvestDate: cropDetails.harvestDate,
  //         }
  //       }),
  //     )
  //     return cropsWithDetails
  //   } catch (error) {
  //     console.log('error : ' + error)
  //     throw new Error(error)
  //   }
  // }

  async getVetFarmerAnimals(locationId?: number) {
    if (locationId) {
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId },
        include: {
          childrenLocations: true,
        },
      })

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
    }

    try {
      const locationIds = locationId
        ? await this.locationService.getAllChildrenLocations(locationId)
        : []
      const locationQuery = locationId
        ? { locationId: { in: locationIds } }
        : {}
      const farmerAnimals =
        await this.databaseService.animalFarmerRegistration.groupBy({
          by: ['animalId'],
          where: {
            farmer: {
              user: { ...locationQuery },
            },
          },
          _count: {
            _all: true,
          },
        })

      const animalsWithDetails = await Promise.all(
        farmerAnimals.map(async (animal) => {
          const animalDetails =
            await this.databaseService.animalFarmerRegistration.findFirst({
              where: { animalId: animal.animalId },
              include: {
                animal: true,
              },
            })
          return { ...animalDetails, count: animal._count._all }
          // return {
          //   animalId: animal.animalId,
          //   animalName: animalDetails.animal.name,
          //   count: animal._count._all,
          //   totalPlantedArea: animal._sum.plantedArea,
          //   // Add any other fields you want from cropFarmerRegistration
          //   // For example:
          //   // plantingDate: cropDetails.plantingDate,
          //   // harvestDate: cropDetails.harvestDate,
          // }
        }),
      )

      return animalsWithDetails
    } catch (error) {
      console.log('error : ' + error)
      throw new Error(error)
    }
  }
  async cropHarvestAnalytics(queryDto: PaginationQueryDto, locationId?: number, cooperativeId?: string) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'desc' } = queryDto;

    if (locationId) {
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId },
        include: {
          childrenLocations: true,
        },
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`);
      }
    }

    if (cooperativeId) {
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id: cooperativeId }
      });
      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
      }
    }

    try {
      const locationIds = locationId
        ? await this.locationService.getAllChildrenLocations(locationId)
        : [];

      const locationQuery = locationId
        ? { locationId: { in: locationIds } }
        : {};
      const cooperativeQuery = cooperativeId
        ? { cooperative: { id: cooperativeId } }
        : {};

      // Get all seasons without pagination
      const rawSeasons = await this.databaseService.season.findMany({
        where: {
          farmer: {
            user: { ...locationQuery },
            ...cooperativeQuery
          }
        },
        select: {
          cropTypeId: true,
          produceHarvested: true,
          plantationArea: true,
          croType: {
            select: {
              id: true,
              name: true,
              cropId: true,
              crop: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Process the data to create hierarchical aggregation
      const cropAggregation = rawSeasons.reduce((acc, season) => {
        const cropId = season.croType.crop.id;
        const cropTypeId = season.cropTypeId;
        const produceHarvested = (season.produceHarvested) || 0;
        const plantationArea = (season.plantationArea) || 0;

        if (!acc[cropId]) {
          acc[cropId] = {
            cropId: cropId,
            cropName: season.croType.crop.name,
            totalProduce: 0,
            totalPlantationArea: 0,
            cropTypes: {},
            _count: 0,
          };
        }

        if (!acc[cropId].cropTypes[cropTypeId]) {
          acc[cropId].cropTypes[cropTypeId] = {
            cropTypeId: cropTypeId,
            cropTypeName: season.croType.name,
            totalProduce: 0,
            totalPlantationArea: 0,
            _count: 0,
          };
        }

        acc[cropId].totalProduce += produceHarvested;
        acc[cropId].totalPlantationArea += plantationArea;
        acc[cropId]._count++;
        acc[cropId].cropTypes[cropTypeId].totalProduce += produceHarvested;
        acc[cropId].cropTypes[cropTypeId].totalPlantationArea += plantationArea;
        acc[cropId].cropTypes[cropTypeId]._count++;

        return acc;
      }, {});

      // Transform to array and apply sorting if needed
      let result = Object.values(cropAggregation).map((crop: any) => ({
        ...crop,
        cropTypes: Object.values(crop.cropTypes),
      }));

      // Apply sorting to the aggregated crops
      if (sortBy) {
        result.sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];
          return sortOrder === 'desc'
            ? (bValue > aValue ? 1 : -1)
            : (aValue > bValue ? 1 : -1);
        });
      }

      // Get total count of unique crops
      const totalCount = result.length;

      // Apply pagination to the processed results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResult = result.slice(startIndex, endIndex);

      return {
        data: paginatedResult,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error('Error in cropHarvestAnalytics:', error);
      throw new Error(`Failed to fetch crop harvest analytics: ${error.message}`);
    }
  }
  async getHarvestByYearAndLocation(year: number, locationId?: number) {
    try {
      let locationIds = []
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        })
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`)
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId)
        }

      }
      let locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {}
      // First get all the data we need
      const rawSeasons = await this.databaseService.season.findMany({
        where: {
          farmer: {
            user: {
              ...locationQuery
            },
          },
          createdAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        },
        select: {
          cropTypeId: true,
          produceHarvested: true,
          croType: {  // Note the typo in your schema 'croType'
            select: {
              id: true,
              name: true,
              cropId: true,
              crop: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Process the data to create hierarchical aggregation
      const cropAggregation = rawSeasons.reduce((acc, season) => {
        const cropId = season.croType.crop.id;
        const cropTypeId = season.cropTypeId;
        const produceHarvested = (season.produceHarvested) || 0;

        // Initialize crop if not exists
        if (!acc[cropId]) {
          acc[cropId] = {
            cropId: cropId,
            cropName: season.croType.crop.name,
            totalProduce: 0,
            cropTypes: {},
            _count: 0
          };
        }

        // Initialize cropType if not exists
        if (!acc[cropId].cropTypes[cropTypeId]) {
          acc[cropId].cropTypes[cropTypeId] = {
            cropTypeId: cropTypeId,
            cropTypeName: season.croType.name,
            totalProduce: 0,
            _count: 0
          };
        }

        // Update counts and totals
        acc[cropId].totalProduce += produceHarvested;
        acc[cropId]._count++;
        acc[cropId].cropTypes[cropTypeId].totalProduce += produceHarvested;
        acc[cropId].cropTypes[cropTypeId]._count++;

        return acc;
      }, {});

      // Transform to final format
      const result = Object.values(cropAggregation).map((crop: any) => ({
        ...crop,
        cropTypes: Object.values(crop.cropTypes)
      }));

      return result;
    }
    catch (error) {
      throw new Error(error)
    }
  }

  async getProduceByYearAndLocation(year: number, locationId?: number) {
    try {
      let locationIds = []
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        })
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`)
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId)
        }

      }
      let locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {}

      const records = await this.databaseService.farmerAnimalRegistrationProduce.findMany({
        where: {
          animalFarmerRegistration: {
            animalFarmerRegistration: {
              farmer: {
                user: {
                  ...locationQuery
                }
              }
            }
          },
          createdAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        }
      })
      const produce = records.map(record => {
        return {
          month: record.createdAt.getMonth(),
          quantity: record.amount
        }
      })
      const months = getMonthsArray()
      const produceByMonth = months.map(month => {
        const monthProduce = produce.filter(produce => produce.month === months.indexOf(month))
        const totalProduce = monthProduce.reduce((sum, produce) => {
          return sum + (produce.quantity || 0)
        }, 0)
        return {
          month,
          totalProduce
        }
      })
      return produceByMonth
    }
    catch (error) {
      throw new Error(error)
    }

  }
  async getFarmerAgeRangeByLocation(locationId?: number) {
    try {
      let locationIds = []
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        })
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`)
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId)
        }

      }
      let locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {}
      const farmers = await this.databaseService.farmer.findMany({
        where: {
          user: {
            ...locationQuery
          }
        },
        select: {
          user: {
            select: {
              dob: true
            }
          }
        }
      })
      const ageRanges = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-55': 0,
        '56-65': 0,
        '66+': 0
      }
      const today = new Date()
      farmers.forEach(farmer => {
        const dob = new Date(farmer.user.dob)
        const age = today.getFullYear() - dob.getFullYear()
        if (age >= 18 && age <= 25) {
          ageRanges['18-25']++
        }
        else if (age >= 26 && age <= 35) {
          ageRanges['26-35']++
        }
        else if (age >= 36 && age <= 45) {
          ageRanges['36-45']++
        }
        else if (age >= 46 && age <= 55) {
          ageRanges['46-55']++
        }
        else if (age >= 56 && age <= 65) {
          ageRanges['56-65']++
        }
        else {
          ageRanges['66+']++
        }
      })
      return ageRanges
    }
    catch (error) {
      throw new Error(error)
    }
  }

  async getTopCropFarmerRegistrations(limit?: number, locationId?: number) {
    try {
      let locationIds = []
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        })
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`)
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId)
        }

      }
      let locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {}
      const rawSeasons = await this.databaseService.season.findMany({
        where: {
          farmer: {
            user: {
              ...locationQuery
            }
          },
        },
        select: {
          cropTypeId: true,
          produceHarvested: true,
          croType: {
            select: {
              id: true,
              name: true,
              cropId: true,
              crop: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // First aggregate by crops
      const cropAggregation = rawSeasons.reduce((acc, season) => {
        const cropId = season.croType.crop.id;
        const produceHarvested = (season.produceHarvested) || 0;

        if (!acc[cropId]) {
          acc[cropId] = {
            cropId,
            cropName: season.croType.crop.name,
            totalProduce: 0,
            seasonCount: 0,
            cropTypes: new Set()
          };
        }

        acc[cropId].totalProduce += produceHarvested;
        acc[cropId].seasonCount++;
        acc[cropId].cropTypes.add(season.cropTypeId);

        return acc;
      }, {});

      // Transform to array and sort by totalProduce
      const sortedCrops = Object.values(cropAggregation)
        .map((crop: any) => ({
          ...crop,
          cropTypeCount: crop.cropTypes.size,
          cropTypes: undefined  // Remove the Set
        }))
        .sort((a, b) => b.totalProduce - a.totalProduce)
        .slice(0, limit ?? 10);

      return sortedCrops;
    }
    catch (error) {
      throw new Error(error)
    }
  }

  async adminCards(locationId?: number) {
    try {
      let locationIds = []
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        })
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`)
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId)
        }

      }
      let locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {}
      let totalFarmers = await this.databaseService.farmer.count({})
      let totalCooperatives = await this.databaseService.cooperative.count({
        where: {
          type: CooperativeType.COOPERATIVE,
          ...locationQuery
        }
      })
      let totalGroups = await this.databaseService.cooperative.count({
        where: {
          type: CooperativeType.ITSINDA,
          ...locationQuery
        }
      })
      let totalPlantationArea = await this.databaseService.season.aggregate({
        _sum: {
          plantationArea: true,
        },
        where: {
          farmer: {
            user: {
              ...locationQuery
            }
          }
        }
      });
      let totalCrops = await this.databaseService.crop.count({
        where: {
          creator: {
            ...locationQuery
          }
        }

      })
      let totalAnimals = await this.databaseService.animal.count({
        where: {
          creator: {
            ...locationQuery
          }
        }

      })
      return new AdminCardsDto(totalFarmers, totalCooperatives, totalGroups, totalAnimals, totalCrops, totalPlantationArea._sum.plantationArea);

    } catch (error) {

    }
  }
  async getCooperativeFarmerStatistics(
    locationId?: number,
    cooperativeId?: string,
    viewType: 'cooperative' | 'farmer' = 'cooperative'
  ) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId !== undefined && locationId >= 0 && !Number.isNaN(locationId)) {
        const location = await this.databaseService.location.findUnique({
          where: { id: locationId }
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

      // Fetch farmers with all related data
      const farmers = await this.databaseService.farmer.findMany({
        where: {
          cooperative: {
            ...locationQuery
          },
          ...cooperativeQuery
        },
        include: {
          user: true,
          cooperative: true,
          animalFarmerRegistrations: {
            include: {
              animal: true,
              liveStockRegistrations: {
                include: {
                  breed: true,
                  farmerAnimalRegistrationProduce: {
                    include: {
                      animalProduct: true
                    }
                  }
                }
              }
            }
          },
          cropFarmerRegistrations: {
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          },
          seasons: {
            include: {
              croType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });

      // Process individual farmer data
      const processedFarmers = farmers.map(farmer => {
        // Process animal statistics
        const animalStats = farmer.animalFarmerRegistrations.map(registration => {
          const productStats = registration.liveStockRegistrations
            .flatMap(livestock => livestock.farmerAnimalRegistrationProduce)
            .reduce((acc, produce) => {
              const key = produce.animalProduct.name;
              if (!acc[key]) {
                acc[key] = {
                  productName: key,
                  amounts: {}
                };
              }
              const measurement = produce.measurements;
              if (!acc[key].amounts[measurement]) {
                acc[key].amounts[measurement] = 0;
              }
              acc[key].amounts[measurement] += produce.amount;
              return acc;
            }, {});

          return {
            animalName: registration.animal.name,
            totalAnimals: registration.totalNumber,
            maleCount: registration.maleNumber,
            femaleCount: registration.femaleNumber,
            breeds: [...new Set(registration.liveStockRegistrations.map(ls => ls.breed.breedName))],
            products: Object.values(productStats).map((product: any) => ({
              productName: product.productName,
              amounts: Object.entries(product.amounts).map(([measurement, amount]) => ({
                measurement,
                amount
              }))
            }))
          };
        });

        // Process crop statistics
        const cropStats = farmer.cropFarmerRegistrations.map(registration => ({
          cropName: registration.cropType.crop.name,
          cropType: registration.cropType.name
        }));

        // Process harvest statistics
        const harvestStats = farmer.seasons.reduce((acc, season) => {
          const key = `${season.croType.crop.name}-${season.croType.name}`;
          if (!acc[key]) {
            acc[key] = {
              cropName: season.croType.crop.name,
              cropType: season.croType.name,
              totalHarvested: 0,
              totalArea: 0,
              totalSeeds: 0,
              seasons: []
            };
          }

          acc[key].totalHarvested += season.produceHarvested;
          acc[key].totalArea += season.plantationArea;
          acc[key].totalSeeds += season.seeds;
          acc[key].seasons.push({
            seasonName: season.name,
            startDate: season.startDate,
            endDate: season.endDate,
            status: season.seasonStatus,
            harvested: season.produceHarvested,
            area: season.plantationArea,
            seeds: season.seeds,
            expectedYield: season.expectedYield
          });

          return acc;
        }, {});

        return {
          personalInfo: {
            id: farmer.id,
            name: farmer.user.firstName + ' ' + farmer.user.lastName,
            phoneNumber: farmer.user.telephone,
            cooperative: farmer.cooperative ? {
              id: farmer.cooperative.id,
              name: farmer.cooperative.name,
              type: farmer.cooperative.type
            } : null
          },
          statistics: {
            totalAnimals: animalStats.reduce((sum, stat) => sum + stat.totalAnimals, 0),
            totalCrops: cropStats.length,
            totalSeasons: farmer.seasons.length
          },
          animals: animalStats,
          crops: cropStats,
          harvests: Object.values(harvestStats)
        };
      });

      // Return data based on view type
      if (viewType === 'farmer') {
        return processedFarmers;
      }

      // Group by cooperative for cooperative view
      const cooperativeStats = processedFarmers.reduce((acc, farmer) => {
        if (!farmer.personalInfo.cooperative) {
          if (!acc['unaffiliated']) {
            acc['unaffiliated'] = {
              id: 'unaffiliated',
              name: 'Unaffiliated Farmers',
              type: null,
              farmers: [],
              statistics: {
                totalFarmers: 0,
                totalAnimals: 0,
                totalCrops: 0,
                totalSeasons: 0
              },
              aggregatedAnimals: {},
              aggregatedCrops: new Set(),
              aggregatedHarvests: {}
            };
          }
          acc['unaffiliated'].farmers.push(farmer);
        } else {
          const coopId = farmer.personalInfo.cooperative.id;
          if (!acc[coopId]) {
            acc[coopId] = {
              id: farmer.personalInfo.cooperative.id,
              name: farmer.personalInfo.cooperative.name,
              type: farmer.personalInfo.cooperative.type,
              farmers: [],
              statistics: {
                totalFarmers: 0,
                totalAnimals: 0,
                totalCrops: 0,
                totalSeasons: 0
              },
              aggregatedAnimals: {},
              aggregatedCrops: new Set(),
              aggregatedHarvests: {}
            };
          }
          acc[coopId].farmers.push(farmer);
        }

        const coopKey = farmer.personalInfo.cooperative?.id || 'unaffiliated';
        const coop = acc[coopKey];

        // Update cooperative statistics
        coop.statistics.totalFarmers++;
        coop.statistics.totalAnimals += farmer.statistics.totalAnimals;
        coop.statistics.totalCrops += farmer.statistics.totalCrops;
        coop.statistics.totalSeasons += farmer.statistics.totalSeasons;

        // Aggregate animal data
        farmer.animals.forEach(animal => {
          if (!coop.aggregatedAnimals[animal.animalName]) {
            coop.aggregatedAnimals[animal.animalName] = {
              totalAnimals: 0,
              maleCount: 0,
              femaleCount: 0,
              breeds: new Set(),
              products: {}
            };
          }
          const animalStat = coop.aggregatedAnimals[animal.animalName];
          animalStat.totalAnimals += animal.totalAnimals;
          animalStat.maleCount += animal.maleCount;
          animalStat.femaleCount += animal.femaleCount;
          animal.breeds.forEach(breed => animalStat.breeds.add(breed));

          animal.products.forEach(product => {
            if (!animalStat.products[product.productName]) {
              animalStat.products[product.productName] = {};
            }
            product.amounts.forEach(({ measurement, amount }) => {
              if (!animalStat.products[product.productName][measurement]) {
                animalStat.products[product.productName][measurement] = 0;
              }
              animalStat.products[product.productName][measurement] += amount;
            });
          });
        });

        // Aggregate crop data
        farmer.crops.forEach(crop => {
          coop.aggregatedCrops.add(`${crop.cropName}-${crop.cropType}`);
        });

        // Aggregate harvest data
        farmer.harvests.forEach((harvest: any) => {
          const key = `${harvest.cropName}-${harvest.cropType}`;
          if (!coop.aggregatedHarvests[key]) {
            coop.aggregatedHarvests[key] = {
              cropName: harvest.cropName,
              cropType: harvest.cropType,
              totalHarvested: 0,
              totalArea: 0,
              totalSeeds: 0,
              seasonStats: {}
            };
          }

          const harvestStat = coop.aggregatedHarvests[key];
          harvestStat.totalHarvested += harvest.totalHarvested;
          harvestStat.totalArea += harvest.totalArea;
          harvestStat.totalSeeds += harvest.totalSeeds;

          harvest.seasons.forEach(season => {
            if (!harvestStat.seasonStats[season.seasonName]) {
              harvestStat.seasonStats[season.seasonName] = {
                startDate: season.startDate,
                endDate: season.endDate,
                status: season.status,
                harvested: 0,
                area: 0,
                seeds: 0,
                expectedYield: 0
              };
            }
            const seasonStat = harvestStat.seasonStats[season.seasonName];
            seasonStat.harvested += season.harvested;
            seasonStat.area += season.area;
            seasonStat.seeds += season.seeds;
            seasonStat.expectedYield += season.expectedYield;
          });
        });

        return acc;
      }, {});

      // Transform cooperative stats for final output
      return Object.values(cooperativeStats).map((coop: any) => ({
        ...coop,
        aggregatedAnimals: Object.entries(coop.aggregatedAnimals).map(([animalName, stats]: any) => ({
          animalName,
          totalAnimals: stats.totalAnimals,
          maleCount: stats.maleCount,
          femaleCount: stats.femaleCount,
          breeds: Array.from(stats.breeds),
          products: Object.entries(stats.products).map(([productName, amounts]) => ({
            productName,
            amounts: Object.entries(amounts).map(([measurement, amount]) => ({
              measurement,
              amount
            }))
          }))
        })),
        aggregatedCrops: Array.from(coop.aggregatedCrops).map((cropKey: any) => {
          const [cropName, cropType] = cropKey.split('-');
          return { cropName, cropType };
        }),
        aggregatedHarvests: Object.values(coop.aggregatedHarvests).map((harvest: any) => ({
          ...harvest,
          seasonStats: Object.entries(harvest.seasonStats).map(([seasonName, stats]: any) => ({
            seasonName,
            ...stats
          }))
        }))
      }));

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
  async farmerCropsRelation(locationId?: number, limit: number = 0) {
    try {
      const whereClause: any = {};

      // Only add location filter if locationId is provided
      if (locationId) {
        whereClause.user = {
          locationId: locationId
        };
      }

      const farmers = await this.databaseService.farmer.findMany({
        where: whereClause,
        include: {
          cropFarmerRegistrations: {
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

      // Group farmers by crop
      const cropFarmerMap = new Map();

      // Process each farmer
      farmers.forEach(farmer => {
        farmer.cropFarmerRegistrations.forEach(registration => {
          const cropName = registration.cropType.crop.name;
          const cropId = registration.cropType.crop.id;

          if (!cropFarmerMap.has(cropId)) {
            cropFarmerMap.set(cropId, {
              id: cropId,
              name: cropName,
              farmerCount: 0,
              farmers: new Set() // Using Set to avoid duplicate farmers
            });
          }

          // Add farmer to the set for this crop
          cropFarmerMap.get(cropId).farmers.add(farmer.id);
        });
      });

      // Convert the map to array and calculate counts
      const result = Array.from(cropFarmerMap.values()).map(item => ({
        id: item.id,
        name: item.name,
        farmerCount: item.farmers.size
      }));

      // Sort by farmer count in descending order
      result.sort((a, b) => b.farmerCount - a.farmerCount);

      // Apply the limit if provided
      return limit > 0 ? result.slice(0, limit) : result;
    } catch (e) {
      throw e;
    }
  }
  async cropLandDistributionRelation(locationId?: number, harvestSeasonId?: string, limit: number = 0) {
    try {
      // Build the where clause for seasons query
      const whereClause: any = {};

      // Filter by harvest season if provided
      if (harvestSeasonId) {
        whereClause.harvestSeasonId = harvestSeasonId;
      }

      // If location is provided, filter farmers by location
      if (locationId) {
        whereClause.farmer = {
          user: {
            locationId: locationId
          }
        };
      }

      // Query all seasons with the specified filters
      const seasons = await this.databaseService.season.findMany({
        where: whereClause,
        include: {
          croType: {
            include: {
              crop: true
            }
          }
        }
      });

      // Group and aggregate land distribution by crop
      const cropLandMap = new Map();

      // Process each season
      seasons.forEach(season => {
        const cropId = season.croType.crop.id;
        const cropName = season.croType.crop.name;
        const plantationArea = season.plantationArea || 0;

        if (!cropLandMap.has(cropId)) {
          cropLandMap.set(cropId, {
            id: cropId,
            name: cropName,
            totalArea: 0,
            percentage: 0,
            seasons: []
          });
        }

        // Add this season's area to the crop's total
        cropLandMap.get(cropId).totalArea += plantationArea;
        cropLandMap.get(cropId).seasons.push(season.id);
      });

      // Calculate total area across all crops
      const totalAreaAllCrops = Array.from(cropLandMap.values())
        .reduce((sum, crop) => sum + crop.totalArea, 0);

      // Convert map to array and calculate percentages
      const result = Array.from(cropLandMap.values()).map(item => ({
        id: item.id,
        name: item.name,
        totalArea: item.totalArea,
        percentage: totalAreaAllCrops > 0
          ? Number(((item.totalArea / totalAreaAllCrops) * 100).toFixed(2))
          : 0,
        seasonCount: item.seasons.length
      }));

      // Sort by total area in descending order
      result.sort((a, b) => b.totalArea - a.totalArea);

      // Apply limit if provided
      return limit > 0 ? result.slice(0, limit) : result;
    } catch (e) {
      throw e;
    }
  }
  async cropTrend(cropId: string, locationId?: number) {
    try {
      // Define the base query conditions for seasons
      const whereClause: any = {
        croType: {
          crop: {
            id: cropId
          }
        }
      };

      // Add location filter if provided
      if (locationId) {
        whereClause.farmer = {
          user: {
            locationId: locationId
          }
        };
      }

      // Get current date to determine seasons
      const currentDate = new Date();

      // Get the current harvest season
      const currentHarvestSeason = await this.databaseService.harvestSeason.findFirst({
        where: {
          startDate: { lte: currentDate },
          endDate: { gte: currentDate }
        }
      });

      if (!currentHarvestSeason) {
        throw new NotFoundException("No current harvest season found");
      }

      // Get the previous harvest season
      const previousHarvestSeason = await this.databaseService.harvestSeason.findFirst({
        where: {
          endDate: { lt: currentHarvestSeason.startDate }
        },
        orderBy: {
          endDate: 'desc'
        }
      });

      if (!previousHarvestSeason) {
        throw new NotFoundException("No previous harvest season found for comparison");
      }

      // Get seasons data from current harvest season
      const currentSeasons = await this.databaseService.season.findMany({
        where: {
          ...whereClause,
          harvestSeasonId: currentHarvestSeason.id
        },
        include: {
          croType: {
            include: {
              crop: true
            }
          },
          harvests: true,
          metric: true
        }
      });

      // Get seasons data from previous harvest season
      const previousSeasons = await this.databaseService.season.findMany({
        where: {
          ...whereClause,
          harvestSeasonId: previousHarvestSeason.id
        },
        include: {
          croType: {
            include: {
              crop: true
            }
          },
          harvests: true,
          metric: true
        }
      });

      // Calculate current harvest totals
      let currentHarvestTotal = 0;
      let currentPlantationArea = 0;
      let currentYield = 0;
      let currentMetric = null;

      for (const season of currentSeasons) {
        // Sum up harvest quantities
        const harvestQuantity = season.harvests.reduce((sum, harvest) =>
          sum + (Number(harvest.amount) || 0), 0);

        currentHarvestTotal += harvestQuantity;
        currentPlantationArea += Number(season.plantationArea) || 0;
        currentMetric = season.metric;
      }

      if (currentPlantationArea > 0) {
        currentYield = currentHarvestTotal / currentPlantationArea;
      }

      // Calculate previous harvest totals
      let previousHarvestTotal = 0;
      let previousPlantationArea = 0;
      let previousYield = 0;
      let previousMetric = null;

      for (const season of previousSeasons) {
        // Sum up harvest quantities
        const harvestQuantity = season.harvests.reduce((sum, harvest) =>
          sum + (Number(harvest.amount) || 0), 0);

        previousHarvestTotal += harvestQuantity;
        previousPlantationArea += Number(season.plantationArea) || 0;
        previousMetric = season.metric;
      }

      if (previousPlantationArea > 0) {
        previousYield = previousHarvestTotal / previousPlantationArea;
      }

      // Calculate percentage changes
      const harvestPercentageChange = previousHarvestTotal > 0
        ? ((currentHarvestTotal - previousHarvestTotal) / previousHarvestTotal) * 100
        : null;

      const yieldPercentageChange = previousYield > 0
        ? ((currentYield - previousYield) / previousYield) * 100
        : null;

      const areaPercentageChange = previousPlantationArea > 0
        ? ((currentPlantationArea - previousPlantationArea) / previousPlantationArea) * 100
        : null;

      // Get crop name from any season (they should all be the same crop)
      const cropName = currentSeasons.length > 0
        ? currentSeasons[0].croType.crop.name
        : (previousSeasons.length > 0 ? previousSeasons[0].croType.crop.name : "Unknown");

      // Construct and return result
      return {
        cropId,
        cropName,
        current: {
          harvestSeasonId: currentHarvestSeason.id,
          harvestSeasonName: currentHarvestSeason.name,
          totalHarvest: currentHarvestTotal,
          totalArea: currentPlantationArea,
          yieldPerArea: currentYield,
          metric: currentMetric?.name || "N/A",
          seasonsCount: currentSeasons.length
        },
        previous: {
          harvestSeasonId: previousHarvestSeason.id,
          harvestSeasonName: previousHarvestSeason.name,
          totalHarvest: previousHarvestTotal,
          totalArea: previousPlantationArea,
          yieldPerArea: previousYield,
          metric: previousMetric?.name || "N/A",
          seasonsCount: previousSeasons.length
        },
        comparison: {
          harvestChange: harvestPercentageChange,
          yieldChange: yieldPercentageChange,
          areaChange: areaPercentageChange
        }
      };
    } catch (e) {
      throw e;
    }
  }
  async genderDistribution(locationId?: number) {
    try {
      // Build the query conditions for farmers based on location
      const whereClause: any = {};

      // If location is provided, filter farmers by location
      if (locationId) {
        whereClause.user = {
          locationId: locationId
        };
      }

      // Get all farmers with their user data
      const farmers = await this.databaseService.farmer.findMany({
        where: whereClause,
        select: {
          id: true,
          user: {
            select: {
              id: true,
              gender: true,
              firstName: true,
              lastName: true
            }
          },
          // Include cooperative data to allow analysis by cooperative membership
          cooperative: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Initialize counters for each gender
      const genderCounts = {
        MALE: 0,
        FEMALE: 0,
        OTHER: 0,
        UNKNOWN: 0, // For farmers with no specified gender
        totalFarmers: 0
      };

      // Count farmers by gender
      farmers.forEach(farmer => {
        genderCounts.totalFarmers++;

        if (!farmer.user.gender) {
          genderCounts.UNKNOWN++;
        } else {
          // Increment the appropriate gender counter
          genderCounts[farmer.user.gender]++;
        }
      });

      // Calculate percentages
      const percentages = {
        MALE: genderCounts.totalFarmers > 0 ? (genderCounts.MALE / genderCounts.totalFarmers * 100).toFixed(2) : "0",
        FEMALE: genderCounts.totalFarmers > 0 ? (genderCounts.FEMALE / genderCounts.totalFarmers * 100).toFixed(2) : "0",
        OTHER: genderCounts.totalFarmers > 0 ? (genderCounts.OTHER / genderCounts.totalFarmers * 100).toFixed(2) : "0",
        UNKNOWN: genderCounts.totalFarmers > 0 ? (genderCounts.UNKNOWN / genderCounts.totalFarmers * 100).toFixed(2) : "0"
      };

      // Additional analysis: cooperative membership by gender
      const cooperativeMembership = {
        MALE: { inCooperative: 0, individual: 0 },
        FEMALE: { inCooperative: 0, individual: 0 },
        OTHER: { inCooperative: 0, individual: 0 },
        UNKNOWN: { inCooperative: 0, individual: 0 }
      };

      farmers.forEach(farmer => {
        const gender = farmer.user.gender || 'UNKNOWN';
        if (farmer.cooperative) {
          cooperativeMembership[gender].inCooperative++;
        } else {
          cooperativeMembership[gender].individual++;
        }
      });

      // Get location name if locationId was provided
      let locationName = "All Locations";
      if (locationId) {
        const location = await this.databaseService.location.findUnique({
          where: { id: locationId }
        });
        if (location) {
          locationName = location.name;
        }
      }

      // Return comprehensive gender distribution data
      return {
        location: {
          id: locationId || null,
          name: locationName
        },
        totalFarmers: genderCounts.totalFarmers,
        distribution: {
          counts: genderCounts,
          percentages: percentages
        },
        cooperativeMembership: cooperativeMembership,
        // Return arrays formatted for easy chart visualization
        chartData: {
          labels: ['Male', 'Female', 'Other', 'Unknown'],
          counts: [genderCounts.MALE, genderCounts.FEMALE, genderCounts.OTHER, genderCounts.UNKNOWN],
          percentages: [
            parseFloat(percentages.MALE),
            parseFloat(percentages.FEMALE),
            parseFloat(percentages.OTHER),
            parseFloat(percentages.UNKNOWN)
          ]
        }
      };
    } catch (e) {
      throw e;
    }
  }
  async farmerCardData(locationId?: number) {
    try {
      // Build location filter for queries
      const locationFilter = locationId ?
        { locationId: { in: await this.locationService.getAllChildrenLocations(locationId) } } :
        {};

      // Get total farmers count with location filter if provided
      const totalFarmers = await this.databaseService.farmer.count({
        where: locationId ? {
          user: {
            locationId: locationId
          }
        } : {}
      });

      // Get farmers in cooperatives count
      const farmersInCooperatives = await this.databaseService.farmer.count({
        where: {
          cooperativeId: {
            not: null
          },
          ...(locationId && {
            user: {
              locationId: locationId
            }
          })
        }
      });

      // Calculate individual farmers count
      const individualFarmers = totalFarmers - farmersInCooperatives;

      // Get total cooperatives count
      const totalCooperatives = await this.databaseService.cooperative.count({
        where: locationFilter
      });

      // Calculate percentage of farmers in cooperatives
      const cooperativePercentage = totalFarmers > 0 ?
        (farmersInCooperatives / totalFarmers * 100).toFixed(2) :
        "0";

      // Get location name if locationId provided
      let locationName = "All Locations";
      if (locationId) {
        const location = await this.databaseService.location.findUnique({
          where: { id: locationId }
        });
        if (location) {
          locationName = location.name;
        }
      }

      // Get recent farmer registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRegistrations = await this.databaseService.farmer.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          },
          ...(locationId && {
            user: {
              locationId: locationId
            }
          })
        }
      });

      return {
        location: {
          id: locationId || null,
          name: locationName
        },
        totalFarmers,
        farmersInCooperatives,
        individualFarmers,
        totalCooperatives,
        statistics: {
          cooperativePercentage: parseFloat(cooperativePercentage),
          individualPercentage: totalFarmers > 0 ?
            (individualFarmers / totalFarmers * 100).toFixed(2) :
            "0",
          averageFarmersPerCooperative: totalCooperatives > 0 ?
            (farmersInCooperatives / totalCooperatives).toFixed(2) :
            "0",
          recentRegistrations
        },
        // Format data for chart visualization
        chartData: {
          farmerDistribution: [
            { name: 'In Cooperatives', value: farmersInCooperatives },
            { name: 'Individual', value: individualFarmers }
          ]
        }
      };
    } catch (e) {
      throw e;
    }
  }
}
