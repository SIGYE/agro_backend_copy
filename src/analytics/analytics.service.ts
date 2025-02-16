import { Injectable, NotFoundException } from '@nestjs/common'
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
        const plantedAreaNumber = parseFloat(record.plantationArea) || 0; // Convert string to number, defaulting to 0 if NaN
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
  async cropHarvestAnalytics(queryDto: PaginationQueryDto, locationId?: number) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

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

    try {
      const locationIds = locationId
        ? await this.locationService.getAllChildrenLocations(locationId)
        : [];

      const locationQuery = locationId
        ? { locationId: { in: locationIds } }
        : {};

      // First get total count for pagination
      const totalCount = await this.databaseService.season.count({
        where: {
          farmer: {
            user: { ...locationQuery },
          },
          seasonStatus: SeasonStatus.ENDED,
        },
      });

      // Get paginated data with sorting
      const rawSeasons = await this.databaseService.season.findMany({
        where: {
          farmer: {
            user: { ...locationQuery },
          },
          seasonStatus: SeasonStatus.ENDED,
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
        skip,
        take: limit,
        orderBy: sortBy
          ? {
            [sortBy]: sortOrder,
          }
          : undefined,
      });

      // Process the data to create hierarchical aggregation
      const cropAggregation = rawSeasons.reduce((acc, season) => {
        const cropId = season.croType.crop.id;
        const cropTypeId = season.cropTypeId;
        const produceHarvested = parseFloat(season.produceHarvested) || 0;
        const plantationArea = parseFloat(season.plantationArea) || 0;

        // Initialize crop if not exists
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

        // Initialize cropType if not exists
        if (!acc[cropId].cropTypes[cropTypeId]) {
          acc[cropId].cropTypes[cropTypeId] = {
            cropTypeId: cropTypeId,
            cropTypeName: season.croType.name,
            totalProduce: 0,
            totalPlantationArea: 0,
            _count: 0,
          };
        }

        // Update counts and totals
        acc[cropId].totalProduce += produceHarvested;
        acc[cropId].totalPlantationArea += plantationArea;
        acc[cropId]._count++;
        acc[cropId].cropTypes[cropTypeId].totalProduce += produceHarvested;
        acc[cropId].cropTypes[cropTypeId].totalPlantationArea += plantationArea;
        acc[cropId].cropTypes[cropTypeId]._count++;

        return acc;
      }, {});

      // Transform to final format
      const result = Object.values(cropAggregation).map((crop: any) => ({
        ...crop,
        cropTypes: Object.values(crop.cropTypes),
      }));

      // Return paginated response
      return {
        data: result,
        metadata: {
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
        const produceHarvested = parseFloat(season.produceHarvested) || 0;

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
        const produceHarvested = parseFloat(season.produceHarvested) || 0;

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
      let totalAnimals = await this.databaseService.animal.count({
        where: {
          creator: {
            ...locationQuery
          }

        }
      })
      let totalCrops = await this.databaseService.crop.count({
        where: {
          creator: {
            ...locationQuery
          }
        }

      })
      return new AdminCardsDto(totalFarmers, totalCooperatives, totalGroups, totalAnimals, totalCrops);

    } catch (error) {

    }
  }

}
