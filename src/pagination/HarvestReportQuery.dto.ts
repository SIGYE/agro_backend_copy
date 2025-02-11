import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";
import { ApiProperty } from "@nestjs/swagger";

export class HarvestReportQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsDateString()
    @ApiProperty()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    endDate?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => String)
    @ApiProperty()
    cropTypeId?: string;
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @ApiProperty()
    locationId?: number;
}