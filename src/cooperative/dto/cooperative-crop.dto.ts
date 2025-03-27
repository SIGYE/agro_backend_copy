import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export class cooperativeCropDto {
    @ApiProperty()
    cropTypesId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    measurementUnit: string

}