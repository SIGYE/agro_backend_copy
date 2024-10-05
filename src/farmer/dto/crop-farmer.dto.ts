import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

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
}