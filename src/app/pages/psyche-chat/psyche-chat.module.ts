import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PsycheChatPageRoutingModule } from './psyche-chat-routing.module';
import { PsycheChatPage } from './psyche-chat.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PsycheChatPageRoutingModule
  ],
  declarations: [PsycheChatPage]
})
export class PsycheChatPageModule {}
