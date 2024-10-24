import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateFertiliserDto {
    @ApiProperty()
    @IsString()
    name: string;
}
