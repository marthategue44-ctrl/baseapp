import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { UserProfile, Medication, EmotionalStateLog, DiaryEntry } from '../../models/app.models';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-specialist-dashboard',
  templateUrl: './specialist-dashboard.page.html',
  styleUrls: ['./specialist-dashboard.page.scss'],
  standalone: false
})
export class SpecialistDashboardPage implements OnInit {
  currentDoctor: UserProfile | null = null;
  patientList: UserProfile[] = [];
  selectedPatientId: string = 'paciente_ana_01';

  activeTab: 'meds' | 'moods' | 'diary' | 'chat' = 'meds';

  patientMeds: Medication[] = [];
  patientMoods: EmotionalStateLog[] = [];
  patientDiary: DiaryEntry[] = [];

  // Formulario nuevo medicamento
  newMedName: string = '';
  newMedDose: string = '';
  newMedTime: string = '';

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentDoctor = this.authService.currentUser;
    if (!this.currentDoctor || this.currentDoctor.role !== 'psicologo') {
      this.router.navigate(['/login']);
      return;
    }

    this.patientList = this.authService.getAllPatients();
    if (this.patientList.length > 0) {
      this.selectedPatientId = this.patientList[0].uid;
    }

    this.loadPatientData();

    // Suscribirse a cambios reactivos
    this.dataService.medications$.subscribe(() => this.loadPatientData());
    this.dataService.moodLogs$.subscribe(() => this.loadPatientData());
    this.dataService.diary$.subscribe(() => this.loadPatientData());
  }

  get selectedPatientName(): string {
    const p = this.patientList.find(item => item.uid === this.selectedPatientId);
    return p ? p.displayName : 'Paciente';
  }

  onPatientChange() {
    this.loadPatientData();
  }

  loadPatientData() {
    this.patientMeds = this.dataService.getMedications(this.selectedPatientId);
    this.patientMoods = this.dataService.getEmotionalLogs(this.selectedPatientId);
    this.patientDiary = this.dataService.getDiaryEntries(this.selectedPatientId);
  }

  async addMedication() {
    if (!this.newMedName.trim() || !this.newMedTime.trim()) {
      return;
    }

    await this.dataService.addMedication(
      this.selectedPatientId,
      this.newMedName.trim(),
      this.newMedDose.trim() || '1 Dosis',
      this.newMedTime.trim()
    );

    const toast = await this.toastCtrl.create({
      message: `Medicamento "${this.newMedName}" prescrito a ${this.selectedPatientName}`,
      duration: 2000,
      color: 'dark'
    });
    await toast.present();

    this.newMedName = '';
    this.newMedDose = '';
    this.newMedTime = '';
  }

  openChatWithPatient() {
    this.router.navigate(['/chat', this.selectedPatientId]);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
