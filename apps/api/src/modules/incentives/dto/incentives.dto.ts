import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IncentiveType } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateIncentiveDto {
  @ApiProperty({ example: 'Weekly 12-job quest' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ enum: IncentiveType })
  @IsEnum(IncentiveType)
  type!: IncentiveType;

  @ApiProperty({ example: 800 })
  @IsPositive()
  reward!: number;

  @ApiPropertyOptional({
    example: { jobs: 12, window: 'week' },
    description: 'Free-form rule the program evaluates against',
  })
  @IsOptional()
  @IsObject()
  criteria?: Record<string, unknown>;
}

export class UpdateIncentiveDto extends PartialType(CreateIncentiveDto) {}
