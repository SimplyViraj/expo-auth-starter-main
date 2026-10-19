import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SessionIdDto {
  @ApiProperty({ description: 'Session ID, never the session token', maxLength: 128 })
  @IsString()
  @Length(1, 128)
  id!: string;
}
export class SessionSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
  @ApiProperty({ type: String, nullable: true }) userAgent!: string | null;
  @ApiProperty() current!: boolean;
}
export class SessionListDto {
  @ApiProperty({ type: [SessionSummaryDto] }) sessions!: SessionSummaryDto[];
}
