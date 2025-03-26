import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignMedicineToAnimalDto {
    @ApiProperty({ description: 'ID of the animal' })
    @IsUUID()
    animalId: string;

    @ApiProperty({ description: 'ID of the medicine' })
    @IsUUID()
    medicineId: string;
}