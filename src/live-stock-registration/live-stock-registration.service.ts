import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLiveStockRegistrationDto } from './dto/create-live-stock-registration.dto';
import { UpdateLiveStockRegistrationDto } from './dto/update-live-stock-registration.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class LiveStockRegistrationService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createLiveStockRegistrationDto: CreateLiveStockRegistrationDto) {
    try {
      console.log("in service")
      let breed = await this.databaseService.breed.findUnique({
        where: {
          id: createLiveStockRegistrationDto.breedId
        }
      })
      if (!breed) {
        throw new NotFoundException("Breed not found")
      }
      let animalFarmerRegistration = await this.databaseService.animalFarmerRegistration.findUnique({
        where: {
          id: createLiveStockRegistrationDto.animalFarmerRegistrationId
        }
      })
      if (!animalFarmerRegistration) {
        throw new NotFoundException("Animal Farmer Registration not found")
      }
      let reg = await this.databaseService.liveStockRegistration.create({
        data: {
          breed: {
            connect: {
              id: createLiveStockRegistrationDto.breedId
            }
          },
          animalFarmerRegistration: {
            connect: {
              id: createLiveStockRegistrationDto.animalFarmerRegistrationId,
            }
          },
          dob: new Date(createLiveStockRegistrationDto.dob),
          weight: createLiveStockRegistrationDto.weight,
          weightMeasurement: createLiveStockRegistrationDto.weightMeasurement,
          purpose: createLiveStockRegistrationDto.purpose,
          animalState: createLiveStockRegistrationDto.animalState
        }
      }
      )
      console.log(reg)
      return reg
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async findAll() {
    try {
      return await this.databaseService.liveStockRegistration.findMany()
    }
    catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllAnimalsInLivesStockRegistration(liveStockRegistrationId: string) {
    try {
      return await this.databaseService.liveStockRegistration.findUnique({
        where: {
          id: liveStockRegistrationId
        }
      }).animalFarmerRegistration().animal()
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.liveStockRegistration.findUnique({
        where: {
          id: id
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }

  }

  async update(id: string, updateLiveStockRegistrationDto: UpdateLiveStockRegistrationDto) {
    try {
      return await this.databaseService.liveStockRegistration.update({
        where: {
          id: id
        },
        data: {
          breedId: updateLiveStockRegistrationDto.breedId,
          animalFarmerRegistrationId: updateLiveStockRegistrationDto.animalFarmerRegistrationId,
          dob: new Date(updateLiveStockRegistrationDto.dob),
          weight: updateLiveStockRegistrationDto.weight,
          weightMeasurement: updateLiveStockRegistrationDto.weightMeasurement
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.liveStockRegistration.delete({
        where: {
          id: id
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }
  }
}
