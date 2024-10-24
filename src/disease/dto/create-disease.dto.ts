import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateDiseaseDto {
    @ApiProperty()
    @IsString()
    name: string;
}
