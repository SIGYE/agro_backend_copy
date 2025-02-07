import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;

    @IsOptional()
    @Type(() => String)
    sortBy?: string;

    @IsOptional()
    @Type(() => String)
    sortOrder?: 'asc' | 'desc' = 'desc';
}