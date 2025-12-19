import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentOutcome {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class RecordPaymentDto {
  @ApiProperty({ enum: PaymentOutcome })
  @IsEnum(PaymentOutcome)
  outcome: PaymentOutcome;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ required: false, description: 'Required when method is MOMO (MSISDN / phone number)' })
  @IsOptional()
  @IsString()
  momoPhoneNumber?: string;

  @ApiProperty({ required: false, description: 'Required when method is CARD (only last 4 digits)' })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
