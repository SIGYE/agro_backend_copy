import { PartialType } from '@nestjs/swagger';
import { CropCooperativeDto } from './cropCooperativeDto';

export class UpdateCropCooperativeDto extends PartialType(CropCooperativeDto) { }
