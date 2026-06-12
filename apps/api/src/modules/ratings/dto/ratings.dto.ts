import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RatingInputDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiPropertyOptional({ type: [String], example: ['Professional', 'On time'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  review?: string;
}

/** Customer rates the engineer (public) AND the platform (internal) — §8.3. */
export class RateByCustomerDto {
  @ApiProperty({ type: RatingInputDto })
  @ValidateNested()
  @Type(() => RatingInputDto)
  engineer!: RatingInputDto;

  @ApiProperty({ type: RatingInputDto })
  @ValidateNested()
  @Type(() => RatingInputDto)
  platform!: RatingInputDto;
}

/** Engineer rates the customer (admin-only) — §8.3. */
export class RateByEngineerDto extends RatingInputDto {}
