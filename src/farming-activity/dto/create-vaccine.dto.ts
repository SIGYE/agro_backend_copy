import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateVaccineDto {
    @ApiProperty({ description: 'Name of the vaccine' })
    @IsString()
    name: string;
}