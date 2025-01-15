import { ApiProperty } from "@nestjs/swagger";
import { PestType } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class CreatePestDto {
    @ApiProperty()
    @IsString()
    name: string;
    @ApiProperty()
    @IsString()
    medication: string
    @ApiProperty()
    pestType: PestType

}
