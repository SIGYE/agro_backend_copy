import { ApiAmbiguousResponse, ApiProperty } from "@nestjs/swagger"
import { SeasonStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreateSeasonDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    cropTypeId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    plantationArea: number
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    seeds: number
    @ApiProperty()
    produceHarvested?: number
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    expectedYield: number
    @ApiProperty()
    @IsNotEmpty()
    startDate: Date
    @ApiProperty()
    @IsNotEmpty()
    endDate: Date
    @ApiProperty({
        enum: SeasonStatus
    })
    @IsEnum(SeasonStatus)
    status: SeasonStatus
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Type(() => String)
    farmerId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Type(() => String)
    metricId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Type(() => String)
    seedStrainId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Type(() => String)
    harvestSeason: string




}