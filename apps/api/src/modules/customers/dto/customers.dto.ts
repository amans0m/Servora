import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  companyName?: string;
}

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'HQ' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: '12 MG Road' })
  @IsString()
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  state!: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @Length(6, 6)
  pincode!: string;

  @ApiProperty({ example: 12.9759 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 77.6063 })
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
