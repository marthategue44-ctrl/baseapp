import { Component, OnInit } from '@angular/core';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Medication, UserProfile } from '../../models/app.models';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-medication-schedule',
  templateUrl: './medication-schedule.page.html',
  styleUrls: ['./medication-schedule.page.scss'],
  standalone: false
})
export class MedicationSchedulePage implements OnInit {
  currentUser: UserProfile | null = null;
  medications: Medication[] = [];

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    const patientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';

    this.dataService.medications$.subscribe(all => {
      this.medications = all.filter(m => m.patientId === patientId || m.patientId === 'paciente_ana_01');
    });
  }

  async onToggleTaken(med: Medication, event: any) {
    const isChecked = event.target.checked;
    await this.dataService.toggleMedicationTaken(med.id, isChecked);

    const toast = await this.toastCtrl.create({
      message: isChecked 
        ? `¡Registrado! Marcaste ${med.name} como tomado.` 
        : `Actualizado: ${med.name} pendiente.`,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }
}
