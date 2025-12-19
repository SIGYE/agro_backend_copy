import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCropListingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pricePerKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalAvailableKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  availableKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  minimumOrderKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  locationId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

