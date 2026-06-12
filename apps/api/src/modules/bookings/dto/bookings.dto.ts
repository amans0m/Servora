import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Service to book' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ description: 'Service address (must belong to the customer)' })
  @IsString()
  addressId!: string;

  @ApiPropertyOptional({ type: [String], description: 'Selected add-on ids' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];

  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: '2026-06-20T10:00:00Z' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class CreateCustomRequestDto {
  @ApiProperty({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiProperty({ example: 'Need a site survey for a 3-floor office network.' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional({ example: '2026-06-22T09:00:00Z' })
  @IsOptional()
  @IsString()
  preferredTime?: string;
}

export class RescheduleDto {
  @ApiProperty({ example: '2026-06-25T14:00:00Z' })
  @IsString()
  scheduledAt!: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QuoteBookingDto {
  @ApiProperty({ example: 7500, description: 'Admin price for a custom request' })
  @IsPositive()
  amount!: number;
}
