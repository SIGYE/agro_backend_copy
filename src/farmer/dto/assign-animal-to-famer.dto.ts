import { ApiProperty } from "@nestjs/swagger"
import { animalFarmerDto } from "./animal-famer.dto"
import { IsNotEmpty, IsString, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

export class AssignAnimalToFarmerDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    farmerId: string
    @ApiProperty({
        isArray: true,
        type: animalFarmerDto
    })
    @ValidateNested({ each: true })
    @Type(() => animalFarmerDto)
    animals: animalFarmerDto[]
}