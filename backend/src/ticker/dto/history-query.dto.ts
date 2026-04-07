import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export type HistoryRange = '1h' | '1d' | '1w' | '1mo' | '1y' | '5y';
export type HistoryInterval = '1m' | '5m' | '1h' | '1d';

export const HISTORY_RANGES: HistoryRange[] = [
  '1h',
  '1d',
  '1w',
  '1mo',
  '1y',
  '5y',
];
export const HISTORY_INTERVALS: HistoryInterval[] = ['1m', '5m', '1h', '1d'];

/**
 * History query parameters.
 *
 * Two modes, mutually exclusive:
 * - Preset: pass `range` (and optionally `interval`) to get the last N
 *   period relative to now — the backend picks a sensible default
 *   interval for each range.
 * - Custom: pass `from` + `to` ISO-8601 timestamps to get a user-picked
 *   window. When `from`/`to` are present the service ignores `range`.
 */
export class HistoryQueryDto {
  @ApiPropertyOptional({ enum: HISTORY_RANGES, default: '1h' })
  @IsOptional()
  @IsEnum(HISTORY_RANGES)
  range?: HistoryRange = '1h';

  @ApiPropertyOptional({ enum: HISTORY_INTERVALS })
  @IsOptional()
  @IsEnum(HISTORY_INTERVALS)
  interval?: HistoryInterval;

  @ApiPropertyOptional({
    description: 'Custom window start (ISO-8601). Overrides `range`.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Custom window end (ISO-8601). Overrides `range`.',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
