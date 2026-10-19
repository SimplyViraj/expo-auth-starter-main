import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailsDto {
  @ApiProperty({ example: 'INVALID_REQUEST' }) code!: string;
  @ApiProperty({ example: 'Check the request fields and try again.' }) message!: string;
}
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorDetailsDto }) error!: ErrorDetailsDto;
}
