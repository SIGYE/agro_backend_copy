import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator"
import { FertiliserDto } from "src/farmer/dto/fertiliser.dto"

export class CropCooperativeDto {
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