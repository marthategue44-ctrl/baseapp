import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EmotionalStatePage } from './emotional-state.page';

const routes: Routes = [
  {
    path: '',
    component: EmotionalStatePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmotionalStatePageRoutingModule {}
