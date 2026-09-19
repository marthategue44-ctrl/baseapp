import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { UserProfile, Medication, EmotionalStateLog, DiaryEntry } from '../../models/app.models';
import { ToastController } from '@ionic/angular';

interface PatientUnreadItem {
  uid: string;
  displayName: string;
  unread: number;
}

@Component({
  selector: 'app-specialist-dashboard',
  templateUrl: './specialist-dashboard.page.html',
  styleUrls: ['./specialist-dashboard.page.scss'],
  standalone: false
})
export class SpecialistDashboardPage implements OnInit, OnDestroy {
  currentDoctor: UserProfile | null = null;
  patientList: UserProfile[] = [];
  selectedPatientId: string = 'paciente_ana_01';

  activeTab: 'meds' | 'moods' | 'diary' | 'chat' = 'meds';

  patientMeds: Medication[] = [];
  patientMoods: EmotionalStateLog[] = [];
  patientDiary: DiaryEntry[] = [];

  /** Mensajes no leídos del paciente seleccionado */
  selectedPatientUnread: number = 0;

  /** Lista de pacientes que tienen al menos 1 mensaje sin leer */
  patientsWithUnread: PatientUnreadItem[] = [];

  newMedName: string = '';
  newMedDose: string = '';
  newMedTime: string = '';

  private chatSub!: Subscription;
  private medSub!: Subscription;
  private moodSub!: Subscription;
  private diarySub!: Subscription;
  private userSub!: Subscription;
  private allUsersSub!: Subscription;

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

    // Solo pacientes asignados a ESTE doctor
    this.patientList = this.authService.getPatientsForDoctor(this.currentDoctor.uid);
    if (this.patientList.length > 0) {
      this.selectedPatientId = this.patientList[0].uid;
    }

    this.loadPatientData();

    // ── Reaccionar a cambios del perfil del doctor (nombre, foto) ──
    this.userSub = this.authService.currentUser$.subscribe(user => {
      if (user && user.role === 'psicologo') {
        this.currentDoctor = user;
      }
    });

    // ── Reaccionar a cambios en la lista de usuarios (nombres/fotos de pacientes) ──
    this.allUsersSub = this.authService.allUsers$.subscribe(() => {
      // Solo mostrar pacientes asignados a ESTE doctor
      this.patientList = this.authService.getPatientsForDoctor(this.currentDoctor!.uid);
      if (this.patientList.length > 0 && !this.patientList.find(p => p.uid === this.selectedPatientId)) {
        this.selectedPatientId = this.patientList[0].uid;
      }
      this.refreshUnreadBadges();
    });

    // ── Reaccionar a cambios de datos clínicos ──
    this.medSub   = this.dataService.medications$.subscribe(() => this.loadPatientData());
    this.moodSub  = this.dataService.moodLogs$.subscribe(() => this.loadPatientData());
    this.diarySub = this.dataService.diary$.subscribe(() => this.loadPatientData());

    // ── Reaccionar a mensajes nuevos → refrescar todos los badges ──
    this.chatSub = this.dataService.chatMessages$.subscribe(() => {
      this.refreshUnreadBadges();
    });
  }

  ngOnDestroy() {
    this.chatSub?.unsubscribe();
    this.medSub?.unsubscribe();
    this.moodSub?.unsubscribe();
    this.diarySub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.allUsersSub?.unsubscribe();
  }

  private refreshUnreadBadges() {
    if (!this.currentDoctor) return;
    const doctorId = this.currentDoctor.uid;

    // Badge del paciente seleccionado actualmente
    this.selectedPatientUnread = this.dataService.getUnreadCount(
      this.selectedPatientId, doctorId
    );

    // Resumen de todos los pacientes con no leídos
    this.patientsWithUnread = this.patientList
      .map(p => ({
        uid: p.uid,
        displayName: p.displayName,
        unread: this.dataService.getUnreadCount(p.uid, doctorId)
      }))
      .filter(item => item.unread > 0);
  }

  get selectedPatientName(): string {
    const p = this.patientList.find(item => item.uid === this.selectedPatientId);
    return p ? p.displayName : 'Paciente';
  }

  onPatientChange() {
    this.loadPatientData();
    this.refreshUnreadBadges();
  }

  loadPatientData() {
    this.patientMeds  = this.dataService.getMedications(this.selectedPatientId);
    this.patientMoods = this.dataService.getEmotionalLogs(this.selectedPatientId);
    this.patientDiary = this.dataService.getDiaryEntries(this.selectedPatientId);
    this.refreshUnreadBadges();
  }

  /** Selecciona un paciente desde el resumen de no leídos y abre el chat */
  selectPatientAndChat(patientId: string) {
    this.selectedPatientId = patientId;
    this.activeTab = 'chat';
    this.loadPatientData();
  }

  async addMedication() {
    if (!this.newMedName.trim() || !this.newMedTime.trim()) return;

    await this.dataService.addMedication(
      this.selectedPatientId,
      this.newMedName.trim(),
      this.newMedDose.trim() || '1 Dosis',
      this.newMedTime.trim()
    );

    const toast = await this.toastCtrl.create({
      message: `💊 Medicamento "${this.newMedName}" prescrito a ${this.selectedPatientName}`,
      duration: 2200,
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

  goToEditProfile() {
    this.router.navigate(['/edit-profile']);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
