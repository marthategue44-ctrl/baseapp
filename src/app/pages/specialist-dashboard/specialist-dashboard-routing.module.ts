import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SpecialistDashboardPage } from './specialist-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: SpecialistDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SpecialistDashboardPageRoutingModule {}
