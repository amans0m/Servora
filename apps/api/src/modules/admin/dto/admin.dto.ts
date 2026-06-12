import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class SaveIntegrationDto {
  @ApiProperty({
    example: { token: 'sk_live_xxx', baseUrl: 'https://kyc-api.surepass.io' },
    description: 'Provider key/value fields (encrypted at rest)',
  })
  @IsObject()
  values!: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ToggleIntegrationDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
