import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MedicationSchedulePage } from './medication-schedule.page';

const routes: Routes = [
  {
    path: '',
    component: MedicationSchedulePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MedicationSchedulePageRoutingModule {}
