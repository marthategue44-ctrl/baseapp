import { Component, OnInit } from '@angular/core';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { EmotionalStateLog, UserProfile } from '../../models/app.models';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-emotional-state',
  templateUrl: './emotional-state.page.html',
  styleUrls: ['./emotional-state.page.scss'],
  standalone: false
})
export class EmotionalStatePage implements OnInit {
  currentUser: UserProfile | null = null;
  selectedMood: string = '';
  moodNote: string = '';
  recentLogs: EmotionalStateLog[] = [];

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    const patientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';

    this.dataService.moodLogs$.subscribe(() => {
      this.recentLogs = this.dataService.getEmotionalLogs(patientId);
    });
  }

  selectMood(mood: string) {
    if (this.selectedMood === mood) {
      this.selectedMood = '';
    } else {
      this.selectedMood = mood;
    }
  }

  async saveMoodRecord() {
    if (!this.selectedMood) return;

    const patientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';
    await this.dataService.recordMood(patientId, this.selectedMood, this.moodNote);

    const toast = await this.toastCtrl.create({
      message: `¡Estado de ánimo "${this.selectedMood}" guardado y compartido con tu especialista!`,
      duration: 2500,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();

    this.selectedMood = '';
    this.moodNote = '';
  }
}
