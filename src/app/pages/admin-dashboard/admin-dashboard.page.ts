import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserProfile, UserRole } from '../../models/app.models';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: false
})
export class AdminDashboardPage implements OnInit, OnDestroy {

  currentAdmin: UserProfile | null = null;
  allDoctors:   UserProfile[] = [];
  allPatients:  UserProfile[] = [];

  activeTab: 'assign' | 'doctors' | 'patients' = 'assign';

  // ── Asignaciones ───────────────────────────────────────
  selectedDoctorId: string = '';

  // ── Estado del modal CRUD ──────────────────────────────
  showModal:   boolean = false;
  modalMode:   'create' | 'edit' = 'create';
  editingUid:  string = '';

  // Campos del formulario
  formName:             string   = '';
  formEmail:            string   = '';
  formSpecialistCode:   string   = '';
  formRole:             'paciente' | 'psicologo' = 'paciente';
  formAssignedDoctorIds: string[] = [];
  formError:            string   = '';

  // ── Estado del modal de eliminación ───────────────────
  showDeleteConfirm: boolean = false;
  deleteTargetUid:   string  = '';
  deleteTargetName:  string  = '';

  private usersSub!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentAdmin = this.authService.currentUser;
    if (!this.currentAdmin || this.currentAdmin.role !== 'admin') {
      this.router.navigate(['/login']);
      return;
    }
    this.usersSub = this.authService.allUsers$.subscribe(users => {
      this.allDoctors  = users.filter(u => u.role === 'psicologo');
      this.allPatients = users.filter(u => u.role === 'paciente');
    });
  }

  ngOnDestroy() {
    this.usersSub?.unsubscribe();
  }

  // ══════════════════════════════════════════════════════
  // ASIGNACIONES
  // ══════════════════════════════════════════════════════

  selectDoctor(doctorId: string): void {
    this.selectedDoctorId = this.selectedDoctorId === doctorId ? '' : doctorId;
  }

  get selectedDoctorName(): string {
    return this.allDoctors.find(d => d.uid === this.selectedDoctorId)?.displayName ?? '';
  }

  get assignedPatients(): UserProfile[] {
    if (!this.selectedDoctorId) return [];
    return this.authService.getPatientsForDoctor(this.selectedDoctorId);
  }

  get unassignedPatients(): UserProfile[] {
    if (!this.selectedDoctorId) return [];
    const ids = new Set(this.assignedPatients.map(p => p.uid));
    return this.allPatients.filter(p => !ids.has(p.uid));
  }

  getPatientsForDoctor(doctorId: string): UserProfile[] {
    return this.authService.getPatientsForDoctor(doctorId);
  }

  getDoctorsForPatient(patientId: string): UserProfile[] {
    return this.authService.getDoctorsForPatient(patientId);
  }

  async addAssignment(patientId: string): Promise<void> {
    this.authService.assignPatientToDoctor(patientId, this.selectedDoctorId);
    const name = this.allPatients.find(p => p.uid === patientId)?.displayName ?? '';
    await this.showToast(`✅ ${name} asignado/a a ${this.selectedDoctorName}`, 'success');
  }

  async removeAssignment(patientId: string): Promise<void> {
    const name = this.allPatients.find(p => p.uid === patientId)?.displayName ?? '';
    this.authService.removePatientFromDoctor(patientId, this.selectedDoctorId);
    await this.showToast(`🔗 ${name} desvinculado/a de ${this.selectedDoctorName}`, 'warning');
  }

  // ══════════════════════════════════════════════════════
  // CRUD — ABRIR MODAL
  // ══════════════════════════════════════════════════════

  openCreate(role: 'paciente' | 'psicologo'): void {
    this.modalMode            = 'create';
    this.formRole             = role;
    this.formName             = '';
    this.formEmail            = '';
    this.formSpecialistCode   = '';
    this.formAssignedDoctorIds = [];
    this.formError            = '';
    this.showModal            = true;
  }

  openEdit(user: UserProfile): void {
    this.modalMode            = 'edit';
    this.editingUid           = user.uid;
    this.formRole             = user.role as 'paciente' | 'psicologo';
    this.formName             = user.displayName;
    this.formEmail            = user.email;
    this.formSpecialistCode   = user.specialistCode ?? '';
    this.formAssignedDoctorIds = [];
    this.formError            = '';
    this.showModal            = true;
  }

  cancelModal(): void {
    this.showModal = false;
    this.formError = '';
  }

  // ══════════════════════════════════════════════════════
  // CRUD — GUARDAR (crear o editar)
  // ══════════════════════════════════════════════════════

  async saveModal(): Promise<void> {
    this.formError = '';

    if (!this.formName.trim() || !this.formEmail.trim()) {
      this.formError = 'El nombre y el correo son obligatorios.';
      return;
    }
    if (!this.isValidEmail(this.formEmail)) {
      this.formError = 'Ingresa un correo electrónico válido.';
      return;
    }

    try {
      if (this.modalMode === 'create') {
        const created = this.authService.createUser({
          displayName:        this.formName,
          email:              this.formEmail,
          role:               this.formRole,
          specialistCode:     this.formSpecialistCode || undefined,
          assignedDoctorIds:  this.formRole === 'paciente' ? this.formAssignedDoctorIds : undefined
        });
        this.showModal = false;
        await this.showToast(
          `🎉 ${this.formRole === 'psicologo' ? 'Especialista' : 'Paciente'} "${created.displayName}" creado/a`,
          'success'
        );
        // Ir al tab correspondiente para ver el nuevo usuario
        this.activeTab = this.formRole === 'psicologo' ? 'doctors' : 'patients';

      } else {
        this.authService.updateUserByAdmin(this.editingUid, {
          displayName:    this.formName,
          email:          this.formEmail,
          specialistCode: this.formSpecialistCode || undefined
        });
        this.showModal = false;
        await this.showToast(`✏️ Usuario "${this.formName}" actualizado`, 'primary');
      }

    } catch (err: any) {
      this.formError = err.message ?? 'Ocurrió un error. Intenta de nuevo.';
    }
  }

  // ══════════════════════════════════════════════════════
  // CRUD — ELIMINAR
  // ══════════════════════════════════════════════════════

  openDelete(user: UserProfile): void {
    this.deleteTargetUid  = user.uid;
    this.deleteTargetName = user.displayName;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTargetUid   = '';
    this.deleteTargetName  = '';
  }

  async confirmDelete(): Promise<void> {
    const name = this.deleteTargetName;
    try {
      this.authService.deleteUser(this.deleteTargetUid);
      this.showDeleteConfirm = false;
      await this.showToast(`🗑️ Usuario "${name}" eliminado`, 'danger');
    } catch (err: any) {
      this.showDeleteConfirm = false;
      await this.showToast(`⚠️ ${err.message}`, 'warning');
    }
  }

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════

  toggleDoctorCheck(doctorId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.formAssignedDoctorIds.includes(doctorId)) {
        this.formAssignedDoctorIds = [...this.formAssignedDoctorIds, doctorId];
      }
    } else {
      this.formAssignedDoctorIds = this.formAssignedDoctorIds.filter(id => id !== doctorId);
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private async showToast(message: string, color: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2400,
      position: 'bottom',
      color
    });
    await t.present();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
