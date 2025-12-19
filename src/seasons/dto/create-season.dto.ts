import { ApiProperty } from "@nestjs/swagger"
import { SeasonStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from "class-validator"

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

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    produceHarvested?: number

    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    expectedYield: number

    @ApiProperty()
    @IsNotEmpty()
    @IsDateString()
    startDate: string

    @ApiProperty()
    @IsNotEmpty()
    @IsDateString()
    endDate: string

    @ApiProperty({
        enum: SeasonStatus
    })
    @IsEnum(SeasonStatus)
    status: SeasonStatus
    @ApiProperty({ required: false, description: 'Farmer ID - required if not creating for cooperative' })
    @IsOptional()
    @IsString()
    @Type(() => String)
    farmerId?: string

    @ApiProperty({ required: false, description: 'Cooperative ID - required if not creating for farmer' })
    @IsOptional()
    @IsString()
    @Type(() => String)
    cooperativeId?: string

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