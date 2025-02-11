import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";

export class ProduceReportQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    year?: number = new Date().getFullYear();

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    locationId?: number;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    groupByMonth?: boolean = true;
}