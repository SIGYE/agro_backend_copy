import { Controller, Get , Param } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Allow } from 'src/decorators/allow.decorator';
import { log } from 'console';

@Controller('location')
@ApiTags('Location')
@Allow()
export class LocationController {
    constructor( 
        private readonly locationService : LocationService
    ){}

    // / get methods for the location entity 
    
    @Get('/all')
    async getAll(){
        return this.locationService.getAll()
    }

    @Get('/:id')
    @ApiParam({
        name : "id",
        type : Number
    })
    async getLocationById( @Param('id') id: number ){
        return this.locationService.getLocationById(id);
    }

    @Get('/children/:id')
    @ApiParam({
        name : "id",
        type : Number
    })
    async getChildrenLocations(@Param('id') id : number){
        return this.locationService.getChildrenLocations(id)
    }

    @Get('/level/:id')
    @ApiParam({
        name : "id",
        type : Number
    })
    async getLocationByLevel(@Param('id') id : number){
        return this.locationService.getLocationByLevel(id)
    }

    @Get('/location-levels/all')
    async getAllLocationLevels(){
        return this.locationService.getAllLocationLevels()
    }

    @Get('/location-levels/:id')
    @ApiParam({
        name : "id",
        type : Number
    })
    async getLOcationLevelById(@Param("id") id : number){
        return this.locationService.getLOcationLevelById(id)
    }
}
