import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";

export class HarvestReportQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => String)
    cropTypeId?: string;
}