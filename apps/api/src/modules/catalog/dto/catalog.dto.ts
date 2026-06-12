import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'office-network-setup' })
  @IsString()
  @MinLength(3)
  slug!: string;

  @ApiProperty({ example: 'Office Network Setup' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ example: 4999 })
  @IsPositive()
  basePrice!: number;

  @ApiPropertyOptional({ example: 120, default: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ type: [String], example: ['networking', 'cabling'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateAddonDto {
  @ApiProperty({ example: 'Firewall configuration' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 1500 })
  @IsPositive()
  price!: number;
}

export class UpdateAddonDto extends PartialType(CreateAddonDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
