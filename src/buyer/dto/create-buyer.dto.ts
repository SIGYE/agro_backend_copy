import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, ValidateNested, IsNotEmpty } from 'class-validator';
import { BusinessType, PreferredPayment } from '@prisma/client';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { Type } from 'class-transformer';

export class CreateBuyerProfileDto {
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

export class CreateBuyerWithUserDto {
  @ValidateNested()
  @Type(() => CreateUserDto)
  @ApiProperty({ type: CreateUserDto })
  user: CreateUserDto;

  @ValidateNested()
  @Type(() => CreateBuyerProfileDto)
  @ApiProperty({ type: CreateBuyerProfileDto })
  buyer: CreateBuyerProfileDto;
}