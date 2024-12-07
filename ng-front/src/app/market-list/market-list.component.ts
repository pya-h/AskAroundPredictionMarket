import { Component, OnInit } from '@angular/core';
import { MarketService } from '../market.service';
import { Router } from '@angular/router';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-market-list',
  templateUrl: './market-list.component.html',
  styleUrls: ['./market-list.component.css'],
  imports: [NgFor]
})
export class MarketListComponent implements OnInit {
  markets: any[] = [];

  constructor(private marketService: MarketService, private router: Router) {}

  ngOnInit(): void {
    this.marketService.getMarkets().subscribe(
      (response) => {
        this.markets = response.data;
      },
      (error) => {
        console.error('Error loading markets', error);
      }
    );
  }

  openMarket(marketId: number): void {
    this.router.navigate([`/market/${marketId}`]);
  }
}
