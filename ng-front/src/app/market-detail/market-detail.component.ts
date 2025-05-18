import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketService } from '../api/market.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConditionalTokenType } from '../api/market.types';

enum ModalTypesEnum {
  BUY = 'buy',
  SELL = 'sell',
  NONE = 'none',
}

@Component({
  selector: 'app-market-detail',
  templateUrl: './market-detail.component.html',
  styleUrls: ['./market-detail.component.css'],
  imports: [FormsModule, CommonModule],
})
export class MarketDetailComponent implements OnInit {
  selectedOutcomeIndex: number | null = null;
  amount: number = 0;
  isModalOpen: boolean = false;
  modalType: ModalTypesEnum = ModalTypesEnum.NONE;

  market: Record<string, any> = {};
  outcomes: {
    token: ConditionalTokenType;
    price: number;
    balance: bigint | number;
    participationPossibility: number;
    title: string;
  }[] = [];
  successMessage: string | null = null;
  errorMessage: string | null = null;
  infoMessage: string | null = null;

  userCollateralBalance: number | null = null;

  private lastFaucetRequestAt: number | null = null;

  get canRequestFaucet() {
    return (
      !this.lastFaucetRequestAt || this.lastFaucetRequestAt + 60000 < Date.now()
    );
  }

  openModal(outcomeIndex: number, type: string) {
    this.isModalOpen = true;
    this.modalType = type as ModalTypesEnum;
    this.selectedOutcomeIndex = outcomeIndex;
    this.amount = 0;
  }

  closeModal() {
    this.isModalOpen = false;
    this.modalType = ModalTypesEnum.NONE;
    this.selectedOutcomeIndex = null;
  }

  confirmAction() {
    if (
      this.selectedOutcomeIndex === null ||
      this.selectedOutcomeIndex > this.outcomes.length
    )
      return;

    switch (this.modalType) {
      case ModalTypesEnum.BUY:
        this.buyOutcome();
        break;
      case ModalTypesEnum.SELL:
        this.sellOutcome();
        break;
    }
    this.infoMessage = 'Processing ...';
    this.closeModal();
  }

  constructor(
    private route: ActivatedRoute,
    private marketService: MarketService,
    private router: Router
  ) {}

  loadMarket(): void {
    const marketId = +this.route.snapshot.paramMap.get('id')!;
    this.marketService.getMarketById(marketId).subscribe(
      (response) => {
        this.market = response.data;
        const outcomes: ConditionalTokenType[] = this.market?.['outcomeTokens'];
        this.outcomes = outcomes
          .sort((token1, token2) => +token1.tokenIndex - +token2.tokenIndex)
          .map((outcome) => ({
            token: outcome,
            index: outcome.tokenIndex,
            title: outcome.predictionOutcome?.['title'],
            price: this.market?.['statistics']?.[outcome.tokenIndex]?.['price'],
            balance: 0.0,
            participationPossibility:
              this.market?.['statistics']?.[outcome.tokenIndex]?.[
                'participationPossibility'
              ],
          }));

        this.marketService.getUserBalances(marketId).subscribe(
          (response) => {
            try {
              this.updateOutcomeField<bigint>('balance', response.data);
            } catch (ex) {
              console.error(ex);
            }
          },
          (error) => {
            console.error('Error loading user outcome balances!', error);
          }
        );
      },
      (error) => {
        console.error('Error loading market', error);
        this.error = error.error?.message || error.message;
      }
    );

    this.marketService.getUserCollateralBalance(marketId).subscribe(
      (response) => {
        this.userCollateralBalance = Number(response.data);
      },
      (error) => {
        console.error('Error loading user outcome balances!', error);
      }
    );
  }

  ngOnInit(): void {
    this.loadMarket();
  }

  updateOutcomeField<T>(field: string, data?: Record<string, any>[]) {
    if (!data?.length) return;
    for (const info of data) {
      (this.outcomes[info['index']] as any)[field] = info[field] as T;
    }
  }

  set success(message: string) {
    this.infoMessage = this.errorMessage = null;
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  set error(message: string) {
    this.successMessage = this.infoMessage = null;
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }

  buyOutcome(): void {
    if (this.selectedOutcomeIndex !== null) {
      this.marketService
        .buyOutcome(this.market['id'], this.amount, this.selectedOutcomeIndex)
        .subscribe(
          (response) => {
            this.success = 'Token Bought.';
            this.loadMarket();
          },
          (err) => {
            this.error =
              'Failed to buy token: ' + (err.error?.message || err.message);
          }
        );
    }
  }

  sellOutcome(): void {
    if (this.selectedOutcomeIndex !== null) {
      this.marketService
        .sellOutcome(this.market['id'], this.amount, this.selectedOutcomeIndex)
        .subscribe(
          (response) => {
            this.success = 'Token Sold.';
            this.loadMarket();
          },
          (err) => {
            this.error =
              'Failed to sell token: ' + (err.error?.message || err.message);
          }
        );
    }
  }

  backToMarkets() {
    this.router.navigate(['/markets']);
  }

  requestFaucet() {
    if (!this.canRequestFaucet) {
      this.infoMessage = `You can perform faucet request after ${
        60 - (((Date.now() - (this.lastFaucetRequestAt || 0)) / 1e3) | 0)
      }`;
      return;
    }
    this.marketService.requestFaucet().subscribe(
      (response) => {
        this.success = `Received ${response.data?.amount} ${response.data?.token}; Total = ${response.data?.balance} ${response.data?.token}`;
        this.lastFaucetRequestAt = Date.now();
      },
      (err) => {
        this.error = err.error?.message || err.message;
      }
    );
    this.infoMessage = 'Processing ...';
  }
}
