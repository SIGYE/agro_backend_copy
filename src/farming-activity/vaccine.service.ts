import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { AssignVaccineToAnimalDto } from './dto/assign-vaccine-animal.dto';


@Injectable()
export class VaccineService {
    constructor(private readonly databaseService: DatabaseService) { }

    async create(createVaccineDto: CreateVaccineDto) {
        try {
            return await this.databaseService.vaccine.create({
                data: {
                    name: createVaccineDto.name
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async findAll() {
        try {
            return await this.databaseService.vaccine.findMany({
                include: {
                    animalVaccines: {
                        include: {
                            animal: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async findOne(id: string) {
        try {
            return await this.databaseService.vaccine.findUnique({
                where: { id },
                include: {
                    animalVaccines: {
                        include: {
                            animal: true
                        }
                    },
                    farmingActivities: true
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async update(id: string, updateVaccineDto: CreateVaccineDto) {
        try {
            return await this.databaseService.vaccine.update({
                where: { id },
                data: {
                    name: updateVaccineDto.name
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async remove(id: string) {
        try {
            // First remove all relations to prevent foreign key constraint errors
            await this.databaseService.animalVaccine.deleteMany({
                where: { vaccineId: id }
            });

            // Then delete the vaccine
            return await this.databaseService.vaccine.delete({
                where: { id }
            });
        } catch (e) {
            throw e;
        }
    }

    async assignToAnimal(assignDto: AssignVaccineToAnimalDto) {
        try {
            // Check if the relation already exists to prevent duplicates
            const existing = await this.databaseService.animalVaccine.findFirst({
                where: {
                    animalId: assignDto.animalId,
                    vaccineId: assignDto.vaccineId
                }
            });

            if (existing) {
                return existing;
            }

            return await this.databaseService.animalVaccine.create({
                data: {
                    animal: {
                        connect: { id: assignDto.animalId }
                    },
                    vaccine: {
                        connect: { id: assignDto.vaccineId }
                    }
                },
                include: {
                    animal: true,
                    vaccine: true
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async removeAnimalAssignment(animalId: string, vaccineId: string) {
        try {
            return await this.databaseService.animalVaccine.deleteMany({
                where: {
                    animalId,
                    vaccineId
                }
            });
        } catch (e) {
            throw e;
        }
    }
}