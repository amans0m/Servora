import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ enum: [Role.customer, Role.engineer] })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'ops@acme.example' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919000000010' })
  @IsOptional()
  @IsPhoneNumber('IN')
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Company name (customer) or full name (engineer)' })
  @IsString()
  @MinLength(2)
  name!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ops@acme.example' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token of the session to end' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: '+919000000010' })
  @IsPhoneNumber('IN')
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919000000010' })
  @IsPhoneNumber('IN')
  phone!: string;

  @ApiProperty({ example: '4827' })
  @IsString()
  @Length(4, 6)
  code!: string;
}
