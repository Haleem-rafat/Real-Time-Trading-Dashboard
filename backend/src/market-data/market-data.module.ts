import { Module } from '@nestjs/common';
import { TickerModule } from '../ticker/ticker.module';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [TickerModule],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
