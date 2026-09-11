import { Component, OnInit } from '@angular/core';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { DiaryEntry, UserProfile } from '../../models/app.models';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-diary',
  templateUrl: './diary.page.html',
  styleUrls: ['./diary.page.scss'],
  standalone: false
})
export class DiaryPage implements OnInit {
  currentUser: UserProfile | null = null;
  entryTitle: string = '';
  entryContent: string = '';
  entries: DiaryEntry[] = [];

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    const patientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';

    this.dataService.diary$.subscribe(() => {
      this.entries = this.dataService.getDiaryEntries(patientId);
    });
  }

  async submitDiaryEntry() {
    if (!this.entryContent.trim()) return;

    const patientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';
    await this.dataService.addDiaryEntry(patientId, this.entryTitle, this.entryContent);

    const toast = await this.toastCtrl.create({
      message: '¡Entrada guardada! Tu especialista podrá leerla en su registro.',
      duration: 2500,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();

    this.entryTitle = '';
    this.entryContent = '';
  }
}
