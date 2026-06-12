import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeSeverity, DisputeStatus } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RaiseDisputeDto {
  @ApiProperty()
  @IsString()
  bookingId!: string;

  @ApiProperty({ example: 'disputed_proof' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ enum: DisputeSeverity, default: DisputeSeverity.medium })
  @IsOptional()
  @IsEnum(DisputeSeverity)
  severity?: DisputeSeverity;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: [DisputeStatus.resolved, DisputeStatus.rejected] })
  @IsIn([DisputeStatus.resolved, DisputeStatus.rejected])
  status!: DisputeStatus;

  @ApiProperty({ example: 'Refunded 50% and warned the engineer.' })
  @IsString()
  @MinLength(3)
  resolution!: string;
}
