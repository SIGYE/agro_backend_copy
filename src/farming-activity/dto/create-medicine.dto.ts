import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateMedicineDto {
    @ApiProperty({ description: 'Name of the medicine' })
    @IsString()
    name: string;
}