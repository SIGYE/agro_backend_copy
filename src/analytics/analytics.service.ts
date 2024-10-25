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
      // const totalPlantedArea = await this.databaseService.cropFarmerRegistration.groupBy({
      //   by: ['cropId'],
      //   _sum: {
      //     plantedArea: true,
      //   }
      // })

      const cardData = {
        totalFarmers,
        totalCooperatives,
        totalCrops,
        totalPlantedArea: 0,
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
}
