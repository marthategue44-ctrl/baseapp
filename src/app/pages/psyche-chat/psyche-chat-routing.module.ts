import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PsycheChatPage } from './psyche-chat.page';

const routes: Routes = [
  {
    path: '',
    component: PsycheChatPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PsycheChatPageRoutingModule {}
