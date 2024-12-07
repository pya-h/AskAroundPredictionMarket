import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MarketListComponent } from './market-list/market-list.component';
import { MarketDetailComponent } from './market-detail/market-detail.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'markets', component: MarketListComponent },
  { path: 'market/:id', component: MarketDetailComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
