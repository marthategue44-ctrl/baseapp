import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { AiChatService } from '../../services/ai-chat.service';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-psyche-chat',
  templateUrl: './psyche-chat.page.html',
  styleUrls: ['./psyche-chat.page.scss'],
  standalone: false
})
export class PsycheChatPage implements OnInit, AfterViewChecked {
  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  private aiChatService = inject(AiChatService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  messages: ChatMessage[] = [];
  newMessageText: string = '';
  isLoading: boolean = false;
  showEmojiPanel: boolean = false;
  private shouldScrollDown: boolean = false;

  quickPrompts: string[] = [
    '¡Hola Psyche! ¿Cómo estás? 😊',
    'Dame una frase motivadora 🌿',
    'Cuéntame algo para sonreír ✨',
    'Siento un poco de ansiedad 💜',
    'Técnica de respiración 4-7-8 🧘‍♀️'
  ];

  emojiList: string[] = [
    '🌸', '🌿', '💜', '✨', '🧘‍♀️', '🕊️', '☀️', '💧',
    '😊', '🤗', '😌', '🥺', '🫂', '❤️', '🤍', '🌙'
  ];

  constructor() {}

  ngOnInit() {
    this.messages = this.aiChatService.getConversationHistory();

    // Mensaje de bienvenida inicial si el historial está vacío
    if (this.messages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: 'msg_welcome_' + Date.now(),
        role: 'assistant',
        content: '¡Hola! 🌸 Soy Psyche, tu asistente de orientación y apoyo emocional en InnoPsi. Estoy aquí para acompañarte, ayudarte con ejercicios de calma o responder dudas sobre tu aplicación. ¿Cómo te encuentras el día de hoy?',
        timestamp: new Date()
      };
      this.messages.push(welcomeMsg);
    }

    this.shouldScrollDown = true;
  }

  ngAfterViewChecked() {
    if (this.shouldScrollDown) {
      this.scrollToBottom();
      this.shouldScrollDown = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (e) {}
  }

  formatTime(ts: Date | string): string {
    try {
      const d = ts instanceof Date ? ts : new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.sendMessage();
    }
  }

  selectPrompt(promptText: string): void {
    this.newMessageText = promptText;
    this.sendMessage();
  }

  toggleEmojiPanel(): void {
    this.showEmojiPanel = !this.showEmojiPanel;
  }

  insertEmoji(emoji: string): void {
    this.newMessageText += emoji;
  }

  sendMessage(): void {
    const text = this.newMessageText.trim();
    if (!text || this.isLoading) return;

    this.newMessageText = '';
    this.showEmojiPanel = false;
    this.isLoading = true;
    this.shouldScrollDown = true;

    this.aiChatService.sendMessage(text).subscribe({
      next: (botMsg: ChatMessage) => {
        this.messages = this.aiChatService.getConversationHistory();
        this.isLoading = false;
        this.shouldScrollDown = true;
      },
      error: () => {
        this.isLoading = false;
        this.messages = this.aiChatService.getConversationHistory();
        this.shouldScrollDown = true;
      }
    });
  }

  async confirmClearHistory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reiniciar conversación',
      message: '¿Deseas vaciar el historial de conversación con Psyche?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Reiniciar',
          handler: () => {
            this.aiChatService.clearHistory();
            this.messages = [];
            const resetMsg: ChatMessage = {
              id: 'msg_welcome_' + Date.now(),
              role: 'assistant',
              content: '¡Conversación reiniciada! 🌸 Aquí estoy para escucharte y apoyarte en lo que necesites hoy.',
              timestamp: new Date()
            };
            this.messages.push(resetMsg);
            this.shouldScrollDown = true;
          }
        }
      ]
    });
    await alert.present();
  }
}
