import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ example: 20, description: 'percent (0-100) or flat amount' })
  @IsPositive()
  value!: number;

  @ApiPropertyOptional({ example: 'all', description: "'all' or a service category" })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({ example: 100, description: 'null = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 4999, description: 'order subtotal to price the discount against' })
  @IsPositive()
  subtotal!: number;

  @ApiPropertyOptional({ example: 'network' })
  @IsOptional()
  @IsString()
  category?: string;
}
