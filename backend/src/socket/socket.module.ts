import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MarketDataModule } from '../market-data/market-data.module';
import { MarketGateway } from './market.gateway';

@Module({
  imports: [
    MarketDataModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [MarketGateway],
})
export class SocketModule {}
