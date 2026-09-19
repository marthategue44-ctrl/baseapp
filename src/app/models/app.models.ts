export type UserRole = 'paciente' | 'psicologo' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  specialistCode?: string;     // Solo psicólogos — ej: 'PSI-7749'
  assignedDoctorId?: string;   // Primer/único doctor asignado (compatibilidad)
  assignedDoctorName?: string; // Nombre del primer doctor (compatibilidad)
  assignedDoctorIds?: string[];// Lista de todos los doctores asignados al paciente
  photoUrl?: string;           // dataURL o URL de foto de perfil
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  time: string;
  taken: boolean;
  lastTakenDate?: string;
  instructions?: string;
}

export interface EmotionalStateLog {
  id: string;
  patientId: string;
  mood: 'Estresado' | 'Feliz' | 'Triste' | 'Calmado' | string;
  note?: string;
  timestamp: string;
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
