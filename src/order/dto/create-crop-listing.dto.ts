import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsPositive, Min, IsBoolean, IsInt } from 'class-validator';

export class CreateCropListingDto {
  @ApiProperty()
  @IsString()
  cropTypeId: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  pricePerKg: number;

  @ApiProperty({ required: false, default: 'RWF' })
  @IsOptional()
  @IsString()
  currency?: string = 'RWF';

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  totalAvailableKg: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  minimumOrderKg?: number = 1;

  @ApiProperty()
  @IsInt()
  locationId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

}