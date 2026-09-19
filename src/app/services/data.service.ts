import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Medication, EmotionalStateLog, DiaryEntry, ChatMessage } from '../models/app.models';
import { FirebaseService } from './firebase.service';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';

const STORAGE_KEY_MEDS = 'innopsi_medications';
const STORAGE_KEY_MOODS = 'innopsi_moods';
const STORAGE_KEY_DIARY = 'innopsi_diary';
const STORAGE_KEY_CHATS = 'innopsi_chats';
const STORAGE_KEY_READ_TS = 'innopsi_chat_read_ts'; // { [userId_chatId]: isoTimestamp }

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private medicationsSubject = new BehaviorSubject<Medication[]>([]);
  public medications$ = this.medicationsSubject.asObservable();

  private moodLogsSubject = new BehaviorSubject<EmotionalStateLog[]>([]);
  public moodLogs$ = this.moodLogsSubject.asObservable();

  private diarySubject = new BehaviorSubject<DiaryEntry[]>([]);
  public diary$ = this.diarySubject.asObservable();

  private chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public chatMessages$ = this.chatMessagesSubject.asObservable();

  constructor(private fbService: FirebaseService) {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Inicializar Medicamentos por defecto idénticos al screenshot
    const savedMeds = localStorage.getItem(STORAGE_KEY_MEDS);
    if (!savedMeds) {
      const defaultMeds: Medication[] = [
        {
          id: 'med_1',
          patientId: 'paciente_ana_01',
          name: 'Medicamento A',
          dose: '1 Tableta',
          time: '8:00 AM',
          taken: false
        },
        {
          id: 'med_2',
          patientId: 'paciente_ana_01',
          name: 'Medicamento B',
          dose: '1 Cápsula',
          time: '02:00 PM',
          taken: false
        },
        {
          id: 'med_3',
          patientId: 'paciente_ana_01',
          name: 'Medicamento C',
          dose: '1 Tableta',
          time: '08:00 PM',
          taken: false
        }
      ];
      localStorage.setItem(STORAGE_KEY_MEDS, JSON.stringify(defaultMeds));
      this.medicationsSubject.next(defaultMeds);
    } else {
      try {
        this.medicationsSubject.next(JSON.parse(savedMeds));
      } catch (e) {
        this.medicationsSubject.next([]);
      }
    }

    // 2. Inicializar Emociones previas de ejemplo
    const savedMoods = localStorage.getItem(STORAGE_KEY_MOODS);
    if (!savedMoods) {
      const defaultMoods: EmotionalStateLog[] = [
        {
          id: 'mood_1',
          patientId: 'paciente_ana_01',
          mood: 'Calmado',
          note: 'Comencé el día relajada escuchando música.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          formattedDate: 'Ayer, 09:30 AM'
        }
      ];
      localStorage.setItem(STORAGE_KEY_MOODS, JSON.stringify(defaultMoods));
      this.moodLogsSubject.next(defaultMoods);
    } else {
      try {
        this.moodLogsSubject.next(JSON.parse(savedMoods));
      } catch (e) {
        this.moodLogsSubject.next([]);
      }
    }

    // 3. Inicializar Diario de ejemplo
    const savedDiary = localStorage.getItem(STORAGE_KEY_DIARY);
    if (!savedDiary) {
      const defaultDiary: DiaryEntry[] = [
        {
          id: 'diary_1',
          patientId: 'paciente_ana_01',
          title: 'Un momento de reflexión',
          content: 'Hoy me sentí un poco abrumada por el trabajo en la tarde, pero realicé los ejercicios de respiración recomendados y logré calmarme.',
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          formattedDate: 'Hoy, 02:15 PM'
        }
      ];
      localStorage.setItem(STORAGE_KEY_DIARY, JSON.stringify(defaultDiary));
      this.diarySubject.next(defaultDiary);
    } else {
      try {
        this.diarySubject.next(JSON.parse(savedDiary));
      } catch (e) {
        this.diarySubject.next([]);
      }
    }

    // 4. Inicializar Chat con mensaje de bienvenida
    const savedChats = localStorage.getItem(STORAGE_KEY_CHATS);
    if (!savedChats) {
      const defaultChats: ChatMessage[] = [
        {
          id: 'msg_1',
          chatId: 'chat_paciente_ana_01',
          senderId: 'doc_martha_01',
          senderName: 'Dra. Martha Tegue',
          senderRole: 'psicologo',
          text: '¡Hola Ana! Bienvenida a InnoPsi. Recuerda registrar tus tomas y cómo te sientes día a día. Cualquier inquietud, escríbeme por aquí.',
          timestamp: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(defaultChats));
      this.chatMessagesSubject.next(defaultChats);
    } else {
      try {
        this.chatMessagesSubject.next(JSON.parse(savedChats));
      } catch (e) {
        this.chatMessagesSubject.next([]);
      }
    }
  }

  // ================= MEDICAMENTOS =================
  getMedications(patientId: string): Medication[] {
    const all = this.medicationsSubject.value;
    return all.filter(m => m.patientId === patientId || patientId === 'all');
  }

  async toggleMedicationTaken(medId: string, taken: boolean): Promise<void> {
    const current = this.medicationsSubject.value.map(m => {
      if (m.id === medId) {
        return {
          ...m,
          taken,
          lastTakenDate: taken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        };
      }
      return m;
    });

    this.medicationsSubject.next(current);
    localStorage.setItem(STORAGE_KEY_MEDS, JSON.stringify(current));

    // Si Firebase está activo
    if (this.fbService.isFirebaseConfigured) {
      const db = this.fbService.getFirestoreInstance();
      if (db) {
        try {
          await updateDoc(doc(db, 'medications', medId), { taken });
        } catch (e) {
          console.warn('Error actualizando medicamento en Firestore:', e);
        }
      }
    }
  }

  async addMedication(patientId: string, name: string, dose: string, time: string): Promise<Medication> {
    const newMed: Medication = {
      id: 'med_' + Date.now(),
      patientId,
      name,
      dose,
      time,
      taken: false
    };

    const current = [...this.medicationsSubject.value, newMed];
    this.medicationsSubject.next(current);
    localStorage.setItem(STORAGE_KEY_MEDS, JSON.stringify(current));

    if (this.fbService.isFirebaseConfigured) {
      const db = this.fbService.getFirestoreInstance();
      if (db) {
        try {
          await setDoc(doc(db, 'medications', newMed.id), newMed);
        } catch (e) {
          console.warn('Error guardando medicamento en Firestore:', e);
        }
      }
    }

    return newMed;
  }

  async deleteMedication(medId: string): Promise<void> {
    const current = this.medicationsSubject.value.filter(m => m.id !== medId);
    this.medicationsSubject.next(current);
    localStorage.setItem(STORAGE_KEY_MEDS, JSON.stringify(current));
  }

  // ================= ESTADO EMOCIONAL =================
  getEmotionalLogs(patientId: string): EmotionalStateLog[] {
    const all = this.moodLogsSubject.value;
    return all
      .filter(l => l.patientId === patientId || patientId === 'all')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async recordMood(patientId: string, mood: string, note?: string): Promise<EmotionalStateLog> {
    const now = new Date();
    const formatted = now.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                     now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newLog: EmotionalStateLog = {
      id: 'mood_' + Date.now(),
      patientId,
      mood,
      note: note || '',
      timestamp: now.toISOString(),
      formattedDate: formatted
    };

    const current = [newLog, ...this.moodLogsSubject.value];
    this.moodLogsSubject.next(current);
    localStorage.setItem(STORAGE_KEY_MOODS, JSON.stringify(current));

    if (this.fbService.isFirebaseConfigured) {
      const db = this.fbService.getFirestoreInstance();
      if (db) {
        try {
          await setDoc(doc(db, 'moods', newLog.id), newLog);
        } catch (e) {
          console.warn('Error guardando emoción en Firestore:', e);
        }
      }
    }

    return newLog;
  }

  // ================= DIARIO DE SEGUIMIENTO =================
  getDiaryEntries(patientId: string): DiaryEntry[] {
    const all = this.diarySubject.value;
    return all
      .filter(d => d.patientId === patientId || patientId === 'all')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async addDiaryEntry(patientId: string, title: string, content: string): Promise<DiaryEntry> {
    const now = new Date();
    const formatted = now.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                     now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: DiaryEntry = {
      id: 'diary_' + Date.now(),
      patientId,
      title: title.trim() || 'Nota sin título',
      content: content.trim(),
      timestamp: now.toISOString(),
      formattedDate: formatted
    };

    const current = [newEntry, ...this.diarySubject.value];
    this.diarySubject.next(current);
    localStorage.setItem(STORAGE_KEY_DIARY, JSON.stringify(current));

    if (this.fbService.isFirebaseConfigured) {
      const db = this.fbService.getFirestoreInstance();
      if (db) {
        try {
          await setDoc(doc(db, 'diary', newEntry.id), newEntry);
        } catch (e) {
          console.warn('Error guardando diario en Firestore:', e);
        }
      }
    }

    return newEntry;
  }

  // ================= CHAT / MENSAJES DIRECTOS =================
  getChatMessages(patientId: string): ChatMessage[] {
    const chatId = 'chat_' + patientId;
    const all = this.chatMessagesSubject.value;
    return all.filter(m => m.chatId === chatId);
  }

  async sendChatMessage(
    patientId: string, 
    senderId: string, 
    senderName: string, 
    senderRole: 'paciente' | 'psicologo' | 'admin', 
    text: string
  ): Promise<ChatMessage> {
    const chatId = 'chat_' + patientId;
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      chatId,
      senderId,
      senderName,
      senderRole,
      text: text.trim(),
      timestamp: new Date().toISOString()   // ISO completo para comparaciones de no leídos
    };

    const current = [...this.chatMessagesSubject.value, newMsg];
    this.chatMessagesSubject.next(current);
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(current));

    if (this.fbService.isFirebaseConfigured) {
      const db = this.fbService.getFirestoreInstance();
      if (db) {
        try {
          await setDoc(doc(db, 'chats', newMsg.id), newMsg);
        } catch (e) {
          console.warn('Error guardando mensaje en Firestore:', e);
        }
      }
    }

    return newMsg;
  }

  // ================= MENSAJES NO LEÍDOS =================

  /**
   * Cuántos mensajes del chat de 'patientId' fueron enviados por alguien
   * distinto de 'readerId' después de la última vez que marcó el chat como leído.
   */
  getUnreadCount(patientId: string, readerId: string): number {
    const chatId = 'chat_' + patientId;
    const key = `${readerId}__${chatId}`;
    const tsMap: Record<string, string> = JSON.parse(
      localStorage.getItem(STORAGE_KEY_READ_TS) || '{}'
    );
    const lastRead = tsMap[key] ? new Date(tsMap[key]).getTime() : 0;

    return this.chatMessagesSubject.value.filter(m =>
      m.chatId === chatId &&
      m.senderId !== readerId &&
      new Date(m.timestamp).getTime() > lastRead
    ).length;
  }

  /** Marca todos los mensajes actuales como leídos para 'readerId' */
  markChatAsRead(patientId: string, readerId: string): void {
    const chatId = 'chat_' + patientId;
    const key = `${readerId}__${chatId}`;
    const tsMap: Record<string, string> = JSON.parse(
      localStorage.getItem(STORAGE_KEY_READ_TS) || '{}'
    );
    tsMap[key] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_READ_TS, JSON.stringify(tsMap));
  }
}
