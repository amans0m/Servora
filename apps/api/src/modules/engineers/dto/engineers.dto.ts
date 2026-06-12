import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EngineerAvailability } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateEngineerDto {
  @ApiPropertyOptional({ example: 'Rohit Sharma' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ type: [String], example: ['networking', 'security'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

export class SetAvailabilityDto {
  @ApiProperty({ enum: ['online', 'offline'] })
  @IsIn([EngineerAvailability.online, EngineerAvailability.offline])
  availability!: EngineerAvailability;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 12.9719 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 77.6412 })
  @IsLongitude()
  lng!: number;
}

export class RejectEngineerDto {
  @ApiPropertyOptional({ example: 'Certifications could not be verified' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddSkillsDto {
  @ApiProperty({ type: [String], example: ['wifi'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  skills!: string[];
}
