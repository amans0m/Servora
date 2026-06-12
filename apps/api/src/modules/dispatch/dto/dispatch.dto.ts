import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class AssignManuallyDto {
  @ApiProperty({ description: 'Engineer to assign directly' })
  @IsString()
  engineerId!: string;
}

/** Shape of the WebSocket `job:respond` message (documented for clients). */
export class RespondOfferDto {
  @ApiProperty()
  @IsString()
  assignmentId!: string;

  @ApiProperty()
  @IsBoolean()
  accept!: boolean;
}
