import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min } from "class-validator";

export class CreateLocationLevelNameDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    code: string;

    @ApiProperty()
    @IsInt()
    @Min(1)
    order_number: number;

    @ApiProperty()
    @IsInt()
    @Min(0)
    countryId: number;
}