import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateMetricDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Unit of measurement (e.g., kg, liter, percent)' })
    @IsString()
    unit: string;
}