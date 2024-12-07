import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  constructor(private apiService: ApiService) {}

  getMarkets() {
    return this.apiService.get(`prediction-market`);
  }

  getMarketById(id: number) {
    return this.apiService.get(`prediction-market/${id}`);
  }

  buyOutcome(
    marketId: number,
    amount: number,
    outcomeIndex: number
  ) {
    return this.apiService.post('prediction-market/ctf/buy', {
      marketId,
      amount,
      outcomeIndex,
    });
  }

  sellOutcome(
    marketId: number,
    amount: number,
    outcomeIndex: number
  ){
    return this.apiService.post('prediction-market/ctf/sell', {
      marketId,
      amount,
      outcomeIndex,
    });
  }
}
