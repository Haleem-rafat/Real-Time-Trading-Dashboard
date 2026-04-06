import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import { TickerService } from '../ticker/ticker.service';
import { AppEvents } from '../common/enums/socket-events.enum';
import type { PriceTick } from './price-generator';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let tickerService: jest.Mocked<
    Pick<TickerService, 'getActiveTickers' | 'getBySymbol' | 'appendHistory'>
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    jest.useFakeTimers();

    tickerService = {
      getActiveTickers: jest.fn().mockResolvedValue([
        { symbol: 'AAPL', base_price: 100, volatility: 0.01 },
        { symbol: 'TSLA', base_price: 200, volatility: 0.02 },
      ]),
      getBySymbol: jest.fn().mockImplementation((sym: string) =>
        Promise.resolve({
          ticker: {},
          lastPrice: sym === 'AAPL' ? 100 : 200,
          lastTimestamp: new Date(),
        }),
      ),
      appendHistory: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = { emit: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(1000) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        { provide: TickerService, useValue: tickerService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(MarketDataService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('emits a price.tick event for each ticker on every interval', async () => {
    await service.onModuleInit();
    expect(eventEmitter.emit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000); // 3 ticks

    // 2 tickers × 3 ticks = 6 emits
    expect(eventEmitter.emit).toHaveBeenCalledTimes(6);

    const firstCall = eventEmitter.emit.mock.calls[0] as unknown as [
      string,
      PriceTick,
    ];
    expect(firstCall[0]).toBe(AppEvents.PRICE_TICK);

    const payload = firstCall[1];
    expect(typeof payload.symbol).toBe('string');
    expect(typeof payload.price).toBe('number');
    expect(typeof payload.change).toBe('number');
    expect(typeof payload.changePct).toBe('number');
    expect(typeof payload.timestamp).toBe('number');
  });

  it('exposes the latest in-memory price via getLastPrice', async () => {
    await service.onModuleInit();
    expect(service.getLastPrice('AAPL')).toBe(100);
    expect(service.getLastPrice('aapl')).toBe(100); // case-insensitive
    expect(service.getLastPrice('FAKE')).toBeUndefined();

    jest.advanceTimersByTime(1000);
    const after = service.getLastPrice('AAPL');
    expect(typeof after).toBe('number');
    expect(after).toBeGreaterThan(0);
  });

  it('flushes the buffer to history every 10 ticks', async () => {
    await service.onModuleInit();

    jest.advanceTimersByTime(9000); // 9 ticks
    expect(tickerService.appendHistory).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000); // 10th tick triggers flush
    // flush is fired-and-forgotten via void; let microtasks run
    await Promise.resolve();
    await Promise.resolve();

    expect(tickerService.appendHistory).toHaveBeenCalledTimes(1);
    const docs = tickerService.appendHistory.mock.calls[0][0];
    // 10 ticks × 2 tickers = 20 buffered docs
    expect(docs).toHaveLength(20);
  });

  it('returns a snapshot of all last prices', async () => {
    await service.onModuleInit();
    const snapshot = service.getAllLastPrices();
    expect(snapshot).toEqual({ AAPL: 100, TSLA: 200 });
  });
});
