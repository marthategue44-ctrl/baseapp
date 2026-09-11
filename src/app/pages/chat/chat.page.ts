import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { ChatMessage, UserProfile } from '../../models/app.models';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false
})
export class ChatPage implements OnInit {
  currentUser: UserProfile | null = null;
  targetPatientId: string = 'paciente_ana_01';
  partnerName: string = 'Dra. Martha Tegue';
  messages: ChatMessage[] = [];
  newMessageText: string = '';

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    const routePatientId = this.route.snapshot.paramMap.get('patientId');

    if (this.currentUser?.role === 'psicologo') {
      this.targetPatientId = routePatientId || 'paciente_ana_01';
      // Buscar nombre del paciente
      const patients = this.authService.getAllPatients();
      const p = patients.find(item => item.uid === this.targetPatientId);
      this.partnerName = p ? p.displayName : 'Paciente';
    } else {
      // Es paciente
      this.targetPatientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';
      this.partnerName = this.currentUser?.assignedDoctorName || 'Dra. Martha Tegue';
    }

    this.dataService.chatMessages$.subscribe(() => {
      this.messages = this.dataService.getChatMessages(this.targetPatientId);
    });
  }

  get currentUserId(): string {
    return this.currentUser ? this.currentUser.uid : 'paciente_ana_01';
  }

  get isCurrentUserDoctor(): boolean {
    return this.currentUser?.role === 'psicologo';
  }

  get backRoute(): string {
    return this.isCurrentUserDoctor ? '/specialist-dashboard' : '/home';
  }

  async sendMessage() {
    if (!this.newMessageText.trim() || !this.currentUser) return;

    await this.dataService.sendChatMessage(
      this.targetPatientId,
      this.currentUser.uid,
      this.currentUser.displayName,
      this.currentUser.role,
      this.newMessageText
    );

    this.newMessageText = '';
  }
}
