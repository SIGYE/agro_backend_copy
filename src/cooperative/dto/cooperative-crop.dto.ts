import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString, IsUUID, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export class cooperativeCropDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    cropTypesId: string
    // @ApiProperty()
    // @IsNotEmpty()
    // @IsString()
    // measurementUnit: string

}   