import api from '..';
import { EAPI } from '@constants/endpoints';
import type { IApiResponse } from '../types/api.types';
import type {
  IPricePoint,
  ITicker,
  ITickerWithLastPrice,
  TChartRange,
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
    interval?: THistoryInterval,
  ): Promise<IPricePoint[]> {
    const params: Record<string, string> = { range };
    if (interval) params.interval = interval;
    const { data } = await api.get<IApiResponse<IPricePoint[]>>(
      `${EAPI.TICKERS}/${symbol}/history`,
      { params },
    );
    return data.data;
  }

  public async getHistoryByRange(
    symbol: string,
    range: TChartRange,
  ): Promise<IPricePoint[]> {
    const params: Record<string, string> =
      range.mode === 'preset'
        ? { range: range.range }
        : { from: range.from, to: range.to };
    const { data } = await api.get<IApiResponse<IPricePoint[]>>(
      `${EAPI.TICKERS}/${symbol}/history`,
      { params },
    );
    return data.data;
  }
}

export default Object.freeze(new TickerService());
