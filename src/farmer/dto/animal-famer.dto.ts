import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString } from "class-validator"

export class animalFarmerDto {
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    femaleNumber: number
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    maleNumber: number
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    totalNumber: number
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    animalId: string

}