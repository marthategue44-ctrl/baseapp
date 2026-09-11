import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SpecialistDashboardPageRoutingModule } from './specialist-dashboard-routing.module';
import { SpecialistDashboardPage } from './specialist-dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SpecialistDashboardPageRoutingModule
  ],
  declarations: [SpecialistDashboardPage]
})
export class SpecialistDashboardPageModule {}
