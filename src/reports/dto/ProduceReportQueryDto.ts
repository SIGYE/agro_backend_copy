import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ProduceQueryDto {
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @ApiProperty()
    year?: number = new Date().getFullYear();

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @ApiProperty()
    locationId?: number;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    @ApiProperty()
    groupByMonth?: boolean = true;
}