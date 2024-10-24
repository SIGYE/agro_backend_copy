import { Injectable } from '@nestjs/common';
import { CreateDiseaseDto } from './dto/create-disease.dto';
import { UpdateDiseaseDto } from './dto/update-disease.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class DiseaseService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createDiseaseDto: CreateDiseaseDto, userId: string) {
    try {
      return await this.databaseService.disease.create({
        data: {
          name: createDiseaseDto.name,
          creator:{
            connect:{
              id: userId
            }
          }
        }
      });
    }catch(e){
      throw e;
    }
  }

  async findAll() {
    try{
      return await this.databaseService.disease.findMany();
    }catch(e){
      throw e;
    }
  }

 async findOne(id: string) {
    try{
      return await this.databaseService.disease.findUnique({
        where:{
          id: id
        }
      });
    }catch(e){
      throw e;
    }
  }

 async update(id: string, updateDiseaseDto: UpdateDiseaseDto) {
    try{
      return await this.databaseService.disease.update({
        where:{
          id: id
        },
        data:{
          name: updateDiseaseDto.name
        }
      });
    }catch(e){
      throw e;
    }
  }

  async remove(id: string) {
    try{
      return await this.databaseService.disease.delete({
        where:{
          id: id
        }
      });
    }
    catch(e){
      throw e;
    }
  }
}
