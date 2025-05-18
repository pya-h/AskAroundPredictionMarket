import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import {
  FaucetRequestInfoType,
  MarketBalanceInfoType,
  MarketParticipationInfoType,
  MarketPriceInfoType,
} from './market.types';
import { ResponseFormatObservable } from './api.types';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  constructor(private apiService: ApiService) {}

  getMarkets(justOngoing = false) {
    return this.apiService.get(
      `prediction-market`,
      justOngoing ? { status: 'ongoing' } : {}
    );
  }

  getCategories() {
    return this.apiService.get(
      `prediction-market/category`,
    );
  }

  getMarketById(id: number) {
    return this.apiService.get(`prediction-market/${id}`);
  }

  buyOutcome(marketId: number, amount: number, outcomeIndex: number) {
    return this.apiService.post('prediction-market/ctf/buy', {
      marketId,
      amount,
      outcomeIndex,
    });
  }

  sellOutcome(marketId: number, amount: number, outcomeIndex: number) {
    return this.apiService.post('prediction-market/ctf/sell', {
      marketId,
      amount,
      outcomeIndex,
    });
  }

  getOutcomePrices(
    marketId: number
  ): ResponseFormatObservable<MarketPriceInfoType[]> {
    return this.apiService.get(`prediction-market/${marketId}/ctf/price`);
  }

  getUserBalances(
    marketId: number
  ): ResponseFormatObservable<MarketBalanceInfoType[]> {
    return this.apiService.get(`prediction-market/${marketId}/ctf/balance`);
  }

  getUserCollateralBalance(
    marketId: number
  ): ResponseFormatObservable<MarketBalanceInfoType[]> {
    return this.apiService.get(
      `prediction-market/${marketId}/collateral/balance`
    );
  }

  getParticipationStats(
    marketId: number
  ): ResponseFormatObservable<MarketParticipationInfoType[]> {
    return this.apiService.get(`prediction-market/${marketId}/ctf/stats`);
  }

  requestFaucet(): ResponseFormatObservable<FaucetRequestInfoType> {
    return this.apiService.post(`blockchain-wallet/faucet`);
  }
}
