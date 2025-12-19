import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { FarmerProfileChangesDto } from "./farmer-profile-changes.dto";

export class CreateFarmerProfileChangeRequestDto {
  @ApiProperty({ type: FarmerProfileChangesDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => FarmerProfileChangesDto)
  changes: FarmerProfileChangesDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

