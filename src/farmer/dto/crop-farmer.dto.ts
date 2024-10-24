import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString } from "class-validator"

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
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    fertilizerId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    amountOfFertilizer: number
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    measurementUnit: string
}