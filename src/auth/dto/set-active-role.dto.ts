import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SetActiveRoleDto {
  @ApiProperty({ enum: ['UMUFASHAMYUMVIRE', 'FARMER'] })
  @IsString()
  @IsIn(['UMUFASHAMYUMVIRE', 'FARMER'])
  activeRole: string;
}
