import api from '..';
import { EAPI } from '@constants/endpoints';
import type { IApiResponse } from '../types/api.types';
import type {
  IPricePoint,
  ITicker,
  ITickerWithLastPrice,
  THistoryInterval,
  THistoryRange,
} from '../types/ticker.types';

class TickerService {
  public async getAll(): Promise<ITicker[]> {
    const { data } = await api.get<IApiResponse<ITicker[]>>(EAPI.TICKERS);
    return data.data;
  }

  public async getBySymbol(symbol: string): Promise<ITickerWithLastPrice> {
    const { data } = await api.get<IApiResponse<ITickerWithLastPrice>>(
      `${EAPI.TICKERS}/${symbol}`,
    );
    return data.data;
  }

  public async getHistory(
    symbol: string,
    range: THistoryRange = '1h',
    interval: THistoryInterval = '1m',
  ): Promise<IPricePoint[]> {
    const { data } = await api.get<IApiResponse<IPricePoint[]>>(
      `${EAPI.TICKERS}/${symbol}/history`,
      { params: { range, interval } },
    );
    return data.data;
  }
}

export default Object.freeze(new TickerService());
