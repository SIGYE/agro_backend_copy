import { Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from 'src/database/database.service'
import { LocationService } from 'src/location/location.service'
import { UsersService } from 'src/users/users.service'

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly locationService: LocationService,
    private readonly userService: UsersService,
  ) {}

  async getAgroCardAnalytics(locationId?: number) {
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
        ? await this.locationService.getAllChildrenLocationIds(locationId)
        : (await this.locationService.getAll()).map((location) => location.id)
      //   select count farmers
      const totalFarmers = await this.databaseService.farmer.count({
        where: {
          user: {
            locationId: {
              in: locationIds,
            },
          },
        },
      })
      const totalCooperatives = await this.databaseService.cooperative.count({
        where: {
          locationId: {
            in: locationIds,
          },
        },
      })
      const totalCrops =
        await this.databaseService.cropFarmerRegistration.count({
          where: {
            farmer: {
              user: { locationId: { in: locationIds } },
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
        ? await this.locationService.getAllChildrenLocationIds(locationId)
        : (await this.locationService.getAll()).map((location) => location.id)
      const totalVets = await this.databaseService.veterinary.count({
        where: {
          user: {
            locationId: {
              in: locationIds,
            },
          },
        },
      })
      const totalCrops =
        await this.databaseService.animalFarmerRegistration.count({
          where: {
            farmer: {
              user: { locationId: { in: locationIds } },
            },
          },
        })

      const cardData = {
        totalVets,
        totalCrops,
      }
      return cardData
    } catch (error) {
      throw new Error(error)
    }
  }

  async getAgroFarmerCrops(locationId?: number) {
    const location = locationId
      ? await this.databaseService.location.findUnique({
          where: { id: locationId ?? 1 },
          include: {
            childrenLocations: true,
          },
        })
      : 1

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`)
    }

    try {
      const locationIds =
        await this.locationService.getAllChildrenLocationIds(locationId)
      const farmerCrops =
        await this.databaseService.cropFarmerRegistration.groupBy({
          by: ['cropId'],
          where: {
            farmer: {
              user: { locationId: { in: locationIds } },
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
          return {...cropDetails, count: crop._count._all}
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
      throw new Error(error)
    }
  }
}
