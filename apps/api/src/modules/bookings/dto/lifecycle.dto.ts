import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, Length } from 'class-validator';

export class OtpCodeDto {
  @ApiProperty({ example: '4827' })
  @IsString()
  @Length(4, 6)
  code!: string;
}

export class ProofUploadUrlDto {
  @ApiProperty({ example: 'proof-1.jpg' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({ example: 204800, description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  sizeBytes?: number;
}

export class AttachProofDto {
  // Reference the server-issued storage key (NOT an arbitrary URL) — the
  // server validates it belongs to this booking's proof namespace (§A5).
  @ApiProperty({ example: 'proofs/<bookingId>/<uuid>.jpg' })
  @IsString()
  key!: string;
}

export class PayDto {
  @ApiProperty({ enum: ['upi', 'card', 'netbanking'] })
  @IsIn(['upi', 'card', 'netbanking'])
  method!: 'upi' | 'card' | 'netbanking';

  @ApiPropertyOptional({ description: 'Razorpay payment id from client checkout' })
  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;
}
