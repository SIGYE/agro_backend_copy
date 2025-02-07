import { ApiAmbiguousResponse, ApiProperty } from "@nestjs/swagger"
import { SeasonStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsEnum, IsNotEmpty, IsString } from "class-validator"

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
    @IsString()
    plantationArea: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    seeds: string
    @ApiProperty()
    produceHarvested?: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    expectedYield: string
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


}