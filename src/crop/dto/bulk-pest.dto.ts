import { ApiProperty } from "@nestjs/swagger";
import { PestType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class BulkPestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsEnum(PestType)
    type: PestType;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    medication: string;
}