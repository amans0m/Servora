import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyGstDto {
  @ApiProperty({ example: '27AAACA1234A1Z5' })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, {
    message: 'Invalid GSTIN format',
  })
  gstin!: string;
}

export class AadhaarGenerateOtpDto {
  @ApiProperty({ example: '123456789012' })
  @Matches(/^[0-9]{12}$/, { message: 'Aadhaar must be 12 digits' })
  aadhaar!: string;
}

export class AadhaarSubmitOtpDto {
  @ApiProperty({ example: 'mock_9012', description: 'client_id returned by generate-otp' })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^[0-9]{4,6}$/, { message: 'OTP must be 4-6 digits' })
  otp!: string;
}

export class VerifyPanDto {
  @ApiProperty({ example: 'ABCDE1234F' })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, { message: 'Invalid PAN format' })
  pan!: string;
}

export class VerifyBankDto {
  @ApiProperty({ example: '000123456789' })
  @IsString()
  @Length(6, 20)
  accountNumber!: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC format' })
  ifsc!: string;
}
