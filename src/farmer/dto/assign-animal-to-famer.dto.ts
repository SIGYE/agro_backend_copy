import { ApiProperty } from "@nestjs/swagger"
import { animalFarmerDto } from "./animal-famer.dto"
import { IsNotEmpty, IsString } from "class-validator"

export class AssignAnimalToFarmerDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    farmerId: string
    @ApiProperty()
    animals: animalFarmerDto[]
}