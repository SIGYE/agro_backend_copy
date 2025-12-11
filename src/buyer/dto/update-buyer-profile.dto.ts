import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BusinessType, PreferredPayment } from '@prisma/client';

export class UpdateBuyerProfileDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({
    enum: BusinessType,
    required: false,
  })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ApiProperty()
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    enum: PreferredPayment,
    required: false,
  })
  @IsOptional()
  @IsEnum(PreferredPayment)
  preferredPayment?: PreferredPayment;
}