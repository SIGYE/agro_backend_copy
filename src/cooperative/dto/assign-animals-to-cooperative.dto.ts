import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from "class-validator";
import { animalFarmerDto } from "../../farmer/dto/animal-famer.dto";
import { Type } from "class-transformer";

export class AssignAnimalsToCooperativeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    cooperativeId: string;
    
    @ApiProperty({
        isArray: true,
        type: animalFarmerDto
    })
    @ValidateNested({ each: true })
    @Type(() => animalFarmerDto)
    animals: animalFarmerDto[];
}

