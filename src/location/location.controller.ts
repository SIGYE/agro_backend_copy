import { Controller, Get, Param } from '@nestjs/common';
import { LocationService, LocationWithChildren, LocationWithParent } from './location.service';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Allow } from 'src/decorators/allow.decorator';
import { Location, locationLevel } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';

@Controller('location')
@ApiTags('Location')
@Allow()
export class LocationController {
    constructor(
        private readonly locationService: LocationService
    ) { }

    // / get methods for the location entity 

    @Get('/all')
    async getAll(): Promise<ApiResponse<LocationWithParent[]>> {
        return new ApiResponse<LocationWithParent[]>(true, "Success", await this.locationService.getAll(), 200)
    }

    @Get('/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getLocationById(@Param('id') id: number): Promise<ApiResponse<Location>> {
        return new ApiResponse<Location>(true, "Success", await this.locationService.getLocationById(id), 200);
    }

    @Get('/children/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getChildrenLocations(@Param('id') id: number): Promise<ApiResponse<LocationWithChildren[]>> {
        return new ApiResponse<LocationWithChildren[]>(true, "Success", await this.locationService.getChildrenLocations(id), 200)
    }

    @Get('/level/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getLocationByLevel(@Param('id') id: number): Promise<ApiResponse<Location[]>> {
        return new ApiResponse<Location[]>(true, "Success", await this.locationService.getLocationByLevel(id), 200)
    }

    @Get('/location-levels/all')
    async getAllLocationLevels(): Promise<ApiResponse<locationLevel[]>> {
        return new ApiResponse<locationLevel[]>(true, "Success", await this.locationService.getAllLocationLevels(), 200)
    }

    @Get('/location-levels/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getLOcationLevelById(@Param("id") id: number): Promise<ApiResponse<locationLevel>> {
        return new ApiResponse<locationLevel>(true, "Success", await this.locationService.getLOcationLevelById(id), 200)
    }
    @Get('/all/children/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getAllWithChildren(@Param("id") id: number): Promise<ApiResponse<LocationWithChildren[]>> {
        return new ApiResponse<any>(true, "Success", await this.locationService.getAllChildrenLocations(id), 200)
    }
}
