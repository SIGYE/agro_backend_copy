import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { locationLevels } from 'src/seeders/data/location_level';
import {locationProvince} from 'src/seeders/data/location_province'
import { locationDistrict } from 'src/seeders/data/location_district';
import { locationSector } from 'src/seeders/data/location_sector';
import { locationLevel, Prisma, PrismaClient } from '@prisma/client';
import { LocationSeed } from 'src/seeders/types/location-seed.type';
import { Location } from '@prisma/client';

export type LocationWithParent = Prisma.LocationGetPayload<{
    include : {
        parentLocation : true
    }
}>

export type LocationWithChildren = Prisma.LocationGetPayload<{
    include : {
        childrenLocations : true
    }
}>

@Injectable()
export class LocationService {
     prisma : PrismaClient = new PrismaClient();
    
    constructor(
        private readonly databaseService : DatabaseService
    ){}

    async generateInsertQueries(locations: LocationSeed[]) : Promise<string[]> {
        return locations.map(location => {
            const {
                id,
                createdAt,
                updatedAt,
                parentLocation,
                name,
                locationLevelId,
            } = location;
    
            // Create the SQL INSERT statement
            return `INSERT INTO "location" ("id", "createdAt", "updatedAt", "locationId", "name", "locationLevelId") VALUES (
                ${id}, 
                '${createdAt}', 
                '${updatedAt}', 
                ${parentLocation !== null ? parentLocation?.id : 'NULL'}, 
                '${name}', 
                ${locationLevelId}
            );`;
        });
    }
    
    async executeQueriesWithRetry(queries: string[], retryAttempts: number, retryDelay: number) {
        const retryOperation = async (operation: () => Promise<void>) => {
            for (let attempt = 1; attempt <= retryAttempts; attempt++) {
                try {
                    await operation();
                    return; // Success, exit the function
                } catch (error) {
                    if (attempt === retryAttempts) {
                        console.error(`Operation failed after ${retryAttempts} attempts`, error);
                        throw error; // Rethrow the error if the final attempt fails
                    }
                    console.warn(`Operation failed on attempt ${attempt}. Retrying in ${retryDelay}ms...`, error);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        };
    
        await retryOperation(async () => {
            for (const query of queries) {
                console.log(query);
                await this.prisma.$executeRawUnsafe(query);
            }
        });
    }
    
    async seedLocationsProvinces() {
        const retryAttempts = 5; // Number of retry attempts
        const retryDelay = 2000; // Delay between retries in milliseconds
    
        let newLocations : LocationSeed[] = [];
        for (const location of locationProvince) {
            // Check if the location already exists
            const existingLocation = await this.databaseService.location.findUnique({
                where: { id: location.id },
            });
            if (!existingLocation) {
                newLocations.push(location);
            }
        }
    
        // Generate all SQL queries once after collecting new locations
        const sqlQueries = await this.generateInsertQueries(newLocations);
    
        // Execute the queries with retry logic
        await this.executeQueriesWithRetry(sqlQueries, retryAttempts, retryDelay);
    }   

    async seedLocationDistricts() {
        const retryAttempts = 5; // Number of retry attempts
        const retryDelay = 2000; // Delay between retries in milliseconds
    
        let newLocations : LocationSeed[] = [];
        for (const location of locationDistrict) {
            // Check if the location already exists
            const existingLocation = await this.databaseService.location.findUnique({
                where: { id: location.id },
            });
            if (!existingLocation) {
                newLocations.push(location);
            }
        }
    
        // Generate all SQL queries once after collecting new locations
        const sqlQueries = await this.generateInsertQueries(newLocations);
    
        // Execute the queries with retry logic
        await this.executeQueriesWithRetry(sqlQueries, retryAttempts, retryDelay);
    }
    
    async seedLocationSectors() {
        const retryAttempts = 5; // Number of retry attempts
        const retryDelay = 2000; // Delay between retries in milliseconds
    
        let newLocations : LocationSeed[] = [];
        for (const location of locationSector) {
            // Check if the location already exists
            const existingLocation = await this.databaseService.location.findUnique({
                where: { id: location.id },
            });
            if (!existingLocation) {
                newLocations.push(location);
            }
        }
    
        // Generate all SQL queries once after collecting new locations
        const sqlQueries = await this.generateInsertQueries(newLocations);
    
        // Execute the queries with retry logic
        await this.executeQueriesWithRetry(sqlQueries, retryAttempts, retryDelay);
    }

    // create location level for seeding 
    async seedLocationLevel(){
        for (const level of locationLevels) {
            const existingLevel = await this.databaseService.locationLevel.findUnique({
              where: { id: level.id },
            });
      
            if (!existingLevel) {
              await this.databaseService.locationLevel.create({
                data: {
                  id: level.id,
                  order_number: level.order_number,
                  name: level.name,
                  code: level.code,
                },
              });
            } 
          }
        }
 
    // get methods for the location entity 
    
    async getAll() : Promise<LocationWithParent[]> {
        return this.databaseService.location.findMany({
            include : {
                parentLocation : true
            }
        });
    }

    async getLocationById(id : number) : Promise<Location> {
        return await this.databaseService.location.findUnique({
            where : {
                id : id
            }
        })
    }

    async getChildrenLocations(id : number) : Promise<LocationWithChildren[]> {
        
        return this.databaseService.location.findMany({
            where : {
                locationId : id
            },
            include : {
                childrenLocations : true
            }
        })
    }


    async getLocationByLevel(id : number) : Promise<Location[]> {
        return this.databaseService.location.findMany({
            where  : {
                locationLevelId : id
            },
            include : {
                childrenLocations : true
            }
        })
    }

    async getAllLocationLevels() : Promise<locationLevel[]>{
        return this.databaseService.locationLevel.findMany()
    }

    async getLOcationLevelById(id : number) : Promise<locationLevel>{
        return this.databaseService.locationLevel.findUnique({
            where : {
                id : id
            }
        })
    }
}
