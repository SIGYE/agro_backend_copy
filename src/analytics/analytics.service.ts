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
    const cardData = {
      totalFarmers: 0,
      totalCooperatives: 0,
      totalCrops: 0,
      totalPlantedArea: 0,
    }
    try {
      // Check if the cooperative exists
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId ?? 1 },
        include: {
          childrenLocations: true,
        },
      })

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`)
      }

    //   select count farmers
    const totalFarmers = await this.databaseService.farmer.count({
        where: {
            user: {
                locationId: {
                    in: location.childrenLocations.map(location => location.id)
                }
            }
        }
    })

    } catch (error) {}
  }
}
