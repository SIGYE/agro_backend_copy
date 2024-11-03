import { Injectable } from '@nestjs/common';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class BreedService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createBreedDto: CreateBreedDto) {
    try {
      let animal = await this.databaseService.animal.findUnique({
        where: {
          id: createBreedDto.animalId
        }
      })
      if (!animal) {
        throw new Error("Animal not found")
      }
      return await this.databaseService.breed.create({
        data: {
          breedName: createBreedDto.name,
          animalId: createBreedDto.animalId
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }

  }

  async findAll() {
    try {
      return await this.databaseService.breed.findMany()
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async findAllByAnimal(animalId: string) {
    try {
      return await this.databaseService.breed.findMany({
        where: {
          animalId: animalId
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.breed.findUnique({
        where: {
          id: id
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async update(id: string, updateBreedDto: UpdateBreedDto) {
    try {
      let breed = await this.databaseService.breed.findUnique({
        where: {
          id: id
        }
      })
      if (!breed) {
        throw new Error("Breed not found")
      }
      return await this.databaseService.breed.update({
        where: {
          id: id
        },
        data: {
          breedName: updateBreedDto.name
        }
      })
    }
    catch (error) {
      throw new Error(error.message)
    }
  }

  async remove(id: string) {
    try {

      return await this.databaseService.breed.delete({
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
