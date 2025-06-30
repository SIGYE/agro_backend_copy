import { ApiProperty } from "@nestjs/swagger"
import { IsString } from "class-validator"

export class CropNameDto {
    @ApiProperty()
    @IsString()
    name: string
    @IsString()
    @ApiProperty()
    languageName: string
    @IsString()
    @ApiProperty()
    languageCode: string
    @IsString()
    @ApiProperty()
    cropId?: string

}