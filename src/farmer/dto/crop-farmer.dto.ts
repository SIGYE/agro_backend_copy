import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator"
import { FertiliserDto } from "./fertiliser.dto"
import { Type } from "class-transformer"

export class cropFarmerDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    plantationArea: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    seeds: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    produceHarvested: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    cropsId: string
    @ApiProperty({
        isArray: true,
        type: FertiliserDto
    })
    @ValidateNested({ each: true })
    @Type(() => FertiliserDto)
    fertilisers: FertiliserDto[]

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    measurementUnit: string
}