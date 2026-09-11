import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { EmotionalStatePageRoutingModule } from './emotional-state-routing.module';
import { EmotionalStatePage } from './emotional-state.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EmotionalStatePageRoutingModule
  ],
  declarations: [EmotionalStatePage]
})
export class EmotionalStatePageModule {}
