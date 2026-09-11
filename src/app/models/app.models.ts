export type UserRole = 'paciente' | 'psicologo';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  specialistCode?: string; // Código único si es psicólogo (ej: PSI-1234)
  assignedDoctorId?: string; // UID del doctor asignado si es paciente
  assignedDoctorName?: string; // Nombre del doctor asignado
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string; // ej: Medicamento A
  dose: string; // ej: 1 Tableta
  time: string; // ej: 8:00 AM
  taken: boolean;
  lastTakenDate?: string;
  instructions?: string;
}

export interface EmotionalStateLog {
  id: string;
  patientId: string;
  mood: 'Estresado' | 'Feliz' | 'Triste' | 'Calmado' | string;
  note?: string;
  timestamp: string; // ISO string
  formattedDate?: string;
}

export interface DiaryEntry {
  id: string;
  patientId: string;
  title: string;
  content: string;
  timestamp: string;
  formattedDate?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}
