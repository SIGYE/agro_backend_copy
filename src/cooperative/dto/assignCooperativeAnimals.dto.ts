import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString, ValidateNested } from "class-validator"
import { Type } from "class-transformer"
import { animalCooperativeDto } from "./animalCooperative.dto"

export class AssignAnimalToCooperativeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    cooperativeId: string
    @ApiProperty({
        isArray: true,
        type: animalCooperativeDto
    })
    @ValidateNested({ each: true })
    @Type(() => animalCooperativeDto)
    animals: animalCooperativeDto[]
}