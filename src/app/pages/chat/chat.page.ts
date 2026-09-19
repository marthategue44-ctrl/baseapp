import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { ChatMessage, UserProfile } from '../../models/app.models';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false
})
export class ChatPage implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  currentUser: UserProfile | null = null;
  targetPatientId: string = 'paciente_ana_01';
  partnerName: string = 'Dra. Martha Tegue';
  messages: ChatMessage[] = [];
  newMessageText: string = '';

  showEmojiPanel: boolean = false;
  private shouldScrollDown: boolean = false;
  private chatSub!: Subscription;
  private previousMsgCount: number = 0;

  emojiList: string[] = [
    '😊','😄','😅','😂','🥰','😍','🤗','😌','😔','😢',
    '😩','😤','😡','🥺','😶','🤔','😴','🤒','😇','🫂',
    '❤️','🧡','💛','💚','💙','💜','🤍','💗','💖','💞',
    '👍','👏','🙌','🫶','✌️','🤞','🙏','💪','🫁','🤝',
    '🌸','🌼','🌻','🍃','🌿','🦋','🌈','⭐','✨','🌙',
    '💊','🩺','📋','📝','🗓️','⏰','🔔','💬','📱','🏥'
  ];

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private route: ActivatedRoute,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    const routePatientId = this.route.snapshot.paramMap.get('patientId');

    if (this.currentUser?.role === 'psicologo') {
      this.targetPatientId = routePatientId || 'paciente_ana_01';
      const patients = this.authService.getAllPatients();
      const p = patients.find(item => item.uid === this.targetPatientId);
      this.partnerName = p ? p.displayName : 'Paciente';
    } else {
      this.targetPatientId = this.currentUser ? this.currentUser.uid : 'paciente_ana_01';
      this.partnerName = this.currentUser?.assignedDoctorName || 'Dra. Martha Tegue';
    }

    // Marcar como leído al abrir
    if (this.currentUser) {
      this.dataService.markChatAsRead(this.targetPatientId, this.currentUser.uid);
    }

    this.chatSub = this.dataService.chatMessages$.subscribe(() => {
      const fresh = this.dataService.getChatMessages(this.targetPatientId);

      // Detectar mensaje nuevo de la otra persona y mostrar toast
      if (fresh.length > this.previousMsgCount && this.previousMsgCount > 0) {
        const newest = fresh[fresh.length - 1];
        if (newest.senderId !== this.currentUserId) {
          this.showIncomingToast(newest.senderName, newest.text);
        }
      }

      this.previousMsgCount = fresh.length;
      this.messages = fresh;
      this.shouldScrollDown = true;

      // Marcar como leído al recibir mientras estás en el chat
      if (this.currentUser) {
        this.dataService.markChatAsRead(this.targetPatientId, this.currentUser.uid);
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollDown) {
      this.scrollToBottom();
      this.shouldScrollDown = false;
    }
  }

  ngOnDestroy() {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (e) {}
  }

  private async showIncomingToast(senderName: string, text: string): Promise<void> {
    const preview = text.length > 40 ? text.slice(0, 40) + '…' : text;
    const toast = await this.toastCtrl.create({
      message: `💬 ${senderName}: ${preview}`,
      duration: 3500,
      position: 'top',
      color: 'light',
      cssClass: 'innopsi-chat-toast',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }

  /** Formatea ISO timestamp a hora legible */
  formatTime(ts: string): string {
    try {
      const d = new Date(ts);
      // Si es ISO válido, formatear; si no (legado), devolver tal cual
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
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

  toggleEmojiPanel(): void {
    this.showEmojiPanel = !this.showEmojiPanel;
    if (!this.showEmojiPanel) {
      setTimeout(() => this.messageInput?.nativeElement?.focus(), 50);
    }
  }

  closeEmojiPanel(): void {
    this.showEmojiPanel = false;
  }

  insertEmoji(emoji: string): void {
    this.newMessageText += emoji;
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.sendMessage();
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.newMessageText.trim();
    if (!text || !this.currentUser) return;

    this.showEmojiPanel = false;
    this.newMessageText = '';

    await this.dataService.sendChatMessage(
      this.targetPatientId,
      this.currentUser.uid,
      this.currentUser.displayName,
      this.currentUser.role,
      text
    );

    this.shouldScrollDown = true;
  }
}
