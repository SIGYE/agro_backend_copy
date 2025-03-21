import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator"
import { FertiliserDto } from "./fertiliser.dto"
import { Type } from "class-transformer"

export class cropFarmerDto {
    @ApiProperty()
    cropTypesId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    measurementUnit: string

}