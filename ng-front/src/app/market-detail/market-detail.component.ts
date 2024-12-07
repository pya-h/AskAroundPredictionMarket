import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarketService } from '../market.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
  modalType: string = '';

  market = {
    id: 1,
    question: 'Will it rain tomorrow?',
    outcomeTokens: ['Yes', 'No'],
  };

  openModal(outcomeIndex: number, type: string) {
    this.isModalOpen = true;
    this.modalType = type;
    this.selectedOutcomeIndex = outcomeIndex;
    this.amount = 0;
  }

  closeModal() {
    this.isModalOpen = false;
    this.modalType = '';
    this.selectedOutcomeIndex = null;
  }

  confirmAction() {
    if (this.selectedOutcomeIndex === null) return;

    const action = {
      marketId: 1,
      amount: this.amount,
      outcomeIndex: this.selectedOutcomeIndex,
    };

    if (this.modalType === 'buy') {
      console.log('Buying:', action);
    } else if (this.modalType === 'sell') {
      console.log('Selling:', action);
    }

    this.closeModal();
  }

  constructor(
    private route: ActivatedRoute,
    private marketService: MarketService
  ) {}

  ngOnInit(): void {
    const marketId = +this.route.snapshot.paramMap.get('id')!;
    this.marketService.getMarketById(marketId).subscribe(
      (response) => {
        this.market = response.data;
      },
      (error) => {
        console.error('Error loading market', error);
      }
    );
  }

  buyOutcome(): void {
    if (this.selectedOutcomeIndex !== null) {
      this.marketService
        .buyOutcome(this.market.id, this.amount, this.selectedOutcomeIndex)
        .subscribe(
          (response) => {
            console.log('Purchase successful:', response);
          },
          (error) => {
            console.error('Error buying outcome:', error);
          }
        );
    }
  }

  sellOutcome(): void {
    if (this.selectedOutcomeIndex !== null) {
      this.marketService
        .sellOutcome(this.market.id, this.amount, this.selectedOutcomeIndex)
        .subscribe(
          (response) => {
            console.log('Sell successful:', response);
          },
          (error) => {
            console.error('Error selling outcome:', error);
          }
        );
    }
  }
}
