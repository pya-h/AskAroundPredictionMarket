import { Component, OnInit } from '@angular/core';
import { MarketService } from '../api/market.service';
import { Router } from '@angular/router';
import { CommonModule, NgClass, NgFor, NgIf, NgStyle } from '@angular/common';

@Component({
  selector: 'app-market-list',
  templateUrl: './market-list.component.html',
  styleUrls: ['./market-list.component.css'],
  imports: [NgFor, NgIf, NgClass, NgStyle, CommonModule],
})
export class MarketListComponent implements OnInit {
  markets: any[] = [];
  justOngoing: boolean = true;
  isLoading: boolean = false;
  filterButtonText: string = 'Show All';
  categories: Record<string, string> = {};

  constructor(private marketService: MarketService, private router: Router) {}

  triggerOngoing() {
    this.justOngoing = !this.justOngoing;
    this.getMarkets();
  }

  ngOnInit(): void {
    this.getCategories();
    this.getMarkets();
  }

  getMarkets() {
    this.isLoading = true;
    this.marketService.getMarkets(this.justOngoing).subscribe(
      (response) => {
        this.markets = response.data;
        this.filterButtonText = this.justOngoing ? 'Show All' : 'Only Ongoings';
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading markets', error);
        this.isLoading = false;
      }
    );
  }

  getCategories() {
    this.marketService.getCategories().subscribe(
      (response) => {
        if (response.data) {
          for (const category of response.data) {
            this.categories[category.id] = category['name'];
          }
        }
      },
      (error) => {
        console.error('Failed fetching categories: ', error);
      }
    );
  }

  openMarket(marketId: number): void {
    this.router.navigate([`/market/${marketId}`]);
  }
}
