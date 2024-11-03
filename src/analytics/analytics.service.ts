import { Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from 'src/database/database.service'
import { LocationService } from 'src/location/location.service'
import { UsersService } from 'src/users/users.service'
import { getMonthsArray } from 'src/utils/data.util'

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
      const records = await this.databaseService.cropFarmerRegistration.findMany({
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

  async getAgroFarmerCrops(locationId?: number) {
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
      const farmerCrops =
        await this.databaseService.cropFarmerRegistration.groupBy({
          by: ['cropId'],
          where: {
            farmer: {
              user: { ...locationQuery },
            },
          },
          _count: {
            _all: true,
          },
          // _sum: {
          //   plantedArea: true,
          // },
        })

      const cropsWithDetails = await Promise.all(
        farmerCrops.map(async (crop) => {
          const cropDetails =
            await this.databaseService.cropFarmerRegistration.findFirst({
              where: { cropId: crop.cropId },
              include: {
                crop: true,
              },
            })
          return { ...cropDetails, count: crop._count._all }
          // return {
          //   cropId: crop.cropId,
          //   cropName: cropDetails.crop.name,
          //   count: crop._count._all,
          //   totalPlantedArea: crop._sum.plantedArea,
          //   // Add any other fields you want from cropFarmerRegistration
          //   // For example:
          //   // plantingDate: cropDetails.plantingDate,
          //   // harvestDate: cropDetails.harvestDate,
          // }
        }),
      )
      return cropsWithDetails
    } catch (error) {
      console.log('error : ' + error)
      throw new Error(error)
    }
  }

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
  async cropHarvestAnalytics(locationId?: number) {
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
      // Query the data without using _sum directly, since it's a string field
      const farmerCrops = await this.databaseService.cropFarmerRegistration.groupBy({
        by: ['cropId'],
        where: {
          farmer: {
            user: { ...locationQuery },
          },
        },
        _count: {
          _all: true,
        },
      })

      // Parse and sum `produceHarvested` values manually
      const cropsWithDetails = await Promise.all(
        farmerCrops.map(async (crop) => {
          const cropDetails = await this.databaseService.cropFarmerRegistration.findMany({
            where: { cropId: crop.cropId },
            select: {
              produceHarvested: true,
              crop: { select: { name: true } },
            },
          })

          // Sum up the produceHarvested values after parsing them to numbers
          const harvestedQuantity = cropDetails.reduce((sum, detail) => {
            return sum + (parseFloat(detail.produceHarvested) || 0)
          }, 0)

          return {
            cropId: crop.cropId,
            cropName: cropDetails[0]?.crop.name,
            count: crop._count._all,
            harvestedQuantity,
          }
        })
      )

      return cropsWithDetails

    } catch (error) {
      console.log('error : ' + error)
      throw new Error(error)
    }
  }
  async getHarvestByYearAndLocation(locationId: number, year: number) {
    try {
      const location = await this.databaseService.location.findUnique({
        where: {
          id: locationId
        }
      })
      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
      const locationIds = await this.locationService.getAllChildrenLocations(locationId)
      // const locationQuery = { locationId: { in: locationIds } }
      const records = await this.databaseService.cropFarmerRegistration.findMany({
        where: {
          farmer: {
            user: {
              locationId: {
                in: locationIds
              }
            }
          },
          createdAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        },
        select: {
          produceHarvested: true,
          createdAt: true
        }
      })
      const harvests = records.map(record => {
        return {
          month: record.createdAt.getMonth(),
          quantity: record.produceHarvested
        }
      })
      console.log(harvests)
      const months = getMonthsArray()
      const harvestsByMonth = months.map(month => {
        const monthHarvests = harvests.filter(harvest => harvest.month === months.indexOf(month))
        const totalHarvest = monthHarvests.reduce((sum, harvest) => {
          return sum + (parseFloat(harvest.quantity) || 0)
        }, 0)
        return {
          month,
          totalHarvest
        }
      })
      return harvestsByMonth
    }
    catch (error) {
      throw new Error(error)
    }
  }

  async getProduceByYearAndLocation(locationId: number, year: number) {
    try {
      const location = await this.databaseService.location.findUnique({
        where: {
          id: locationId
        }
      })
      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
      const locationIds = await this.locationService.getAllChildrenLocations(locationId)
      const records = await this.databaseService.liveStockRegistration.findMany({
        where: {
          animalFarmerRegistration: {
            farmer: {
              user: {
                locationId: {
                  in: locationIds
                }
              }
            },
            createdAt: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31)
            }
          }

        },
        select: {
          produce: true,
          createdAt: true
        }
      })
      const produce = records.map(record => {
        return {
          month: record.createdAt.getMonth(),
          quantity: record.produce
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
  async getFarmerAgeRangeByLocation(locationId: number) {
    try {
      const location = await this.databaseService.location.findUnique({
        where: {
          id: locationId
        }
      })
      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
      const locationIds = await this.locationService.getAllChildrenLocations(locationId)
      const farmers = await this.databaseService.farmer.findMany({
        where: {
          user: {
            locationId: {
              in: locationIds
            }
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

  async getTopCropFarmerRegistrations(locationId: number) {
    try {
      const location = await this.databaseService.location.findUnique({
        where: {
          id: locationId
        }
      })
      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }
      const locationIds = await this.locationService.getAllChildrenLocations(locationId)
      const records = await this.databaseService.cropFarmerRegistration.findMany({
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
          crop: {
            select: {
              name: true
            }
          },
          produceHarvested: true
        }
      })
      const crops = records.map(record => {
        return {
          crop: record.crop.name,
          produceHarvested: record.produceHarvested
        }
      })
      const cropCounts = crops.reduce((acc, crop) => {
        if (!acc[crop.crop]) {
          acc[crop.crop] = 0
        }
        acc[crop.crop] += crop.produceHarvested
        return acc
      }, {})
      const topCrops = Object.keys(cropCounts).sort((a, b) => cropCounts[b] - cropCounts[a]).slice(0, 5)
      return topCrops
    }
    catch (error) {
      throw new Error(error)
    }
  }


}
