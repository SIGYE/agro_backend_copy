import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
    @ApiProperty()
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;
    @ApiProperty()
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;
    @ApiProperty()
    @IsOptional()
    @Type(() => String)
    sortBy?: string;
    @ApiProperty()
    @IsOptional()
    @Type(() => String)
    sortOrder?: 'asc' | 'desc' = 'desc';
}