import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProduceDto } from './dto/create-produce.dto';
import { UpdateProduceDto } from './dto/update-produce.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProduceService {
  constructor(private readonly databaseService: DatabaseService) { }
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
      return await this.databaseService.farmerAnimalRegistrationProduce.findMany()
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
        }
      })

    } catch (e) {
      throw new BadRequestException(e.message)
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
