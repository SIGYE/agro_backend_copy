import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsString, IsNumber, IsOptional, IsPositive, 
  Min, IsEnum, ValidateNested, IsArray, 
  ArrayMinSize, IsDateString 
} from 'class-validator';
import { OrderType } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  cropListingId: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Min(0.1)
  quantityKg: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  sellerId: string; 

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}