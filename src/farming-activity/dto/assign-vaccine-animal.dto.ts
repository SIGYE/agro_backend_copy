import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignVaccineToAnimalDto {
    @ApiProperty({ description: 'ID of the animal' })
    @IsUUID()
    animalId: string;

    @ApiProperty({ description: 'ID of the vaccine' })
    @IsUUID()
    vaccineId: string;
}