import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsArray } from "class-validator"
import { Type } from "class-transformer"

export class cooperativeCropDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    cropTypesId: string
    
    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    fertilisers?: any[]
    
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    measurementUnit?: string
}   