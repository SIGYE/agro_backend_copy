import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"
import { FertiliserDto } from "./fertiliser.dto"
import { Type } from "class-transformer"

export class cropFarmerDto {
    @ApiProperty()
    cropTypesId: string
    @ApiProperty()
    @IsOptional()
    @IsString()
    measurementUnit?: string

}