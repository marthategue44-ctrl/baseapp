import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserProfile, UserRole } from '../models/app.models';
import { FirebaseService } from './firebase.service';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';

const STORAGE_KEY_USER = 'innopsi_current_user';
const STORAGE_KEY_ALL_USERS = 'innopsi_all_users';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  // Observable de todos los usuarios — emite cuando se guarda un perfil
  private allUsersSubject = new BehaviorSubject<UserProfile[]>([]);
  public allUsers$: Observable<UserProfile[]> = this.allUsersSubject.asObservable();

  private defaultUsers: UserProfile[] = [
    {
      uid: 'admin_01',
      email: 'admin@innopsi.com',
      displayName: 'Administrador InnoPsi',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      uid: 'doc_martha_01',
      email: 'doctor@innopsi.com',
      displayName: 'Dra. Martha Tegue',
      role: 'psicologo',
      specialistCode: 'PSI-7749',
      createdAt: new Date().toISOString()
    },
    {
      uid: 'paciente_ana_01',
      email: 'paciente@innopsi.com',
      displayName: 'Ana Morales',
      role: 'paciente',
      assignedDoctorId: 'doc_martha_01',
      assignedDoctorName: 'Dra. Martha Tegue',
      assignedDoctorIds: ['doc_martha_01'],
      createdAt: new Date().toISOString()
    }
  ];

  constructor(private fbService: FirebaseService) {
    this.initStoredUsers();
    this.initAuthState();
  }

  private initStoredUsers() {
    const existing = localStorage.getItem(STORAGE_KEY_ALL_USERS);
    if (!existing) {
      // Primera vez: guardar los usuarios por defecto
      this.saveAllUsers(this.defaultUsers);
    } else {
      try {
        const stored: UserProfile[] = JSON.parse(existing);

        // Migración: insertar usuarios demo que falten en localStorage
        // (cubre el caso donde el admin_01 aún no existía en datos guardados)
        let changed = false;
        for (const def of this.defaultUsers) {
          if (!stored.find(u => u.uid === def.uid)) {
            stored.push(def);
            changed = true;
          }
        }

        if (changed) {
          this.saveAllUsers(stored);
        } else {
          this.allUsersSubject.next(stored);
        }
      } catch {
        this.saveAllUsers(this.defaultUsers);
      }
    }
  }

  /** Persiste la lista completa de usuarios y notifica a suscriptores */
  private saveAllUsers(users: UserProfile[]): void {
    localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(users));
    this.allUsersSubject.next(users);
  }

  private initAuthState() {
    // Primero revisar localStorage para respuesta instantánea
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        this.currentUserSubject.next(user);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    }

    // Si Firebase está configurado, escuchar cambios de autenticación en vivo
    if (this.fbService.isFirebaseConfigured) {
      const auth = this.fbService.getAuthInstance();
      const firestore = this.fbService.getFirestoreInstance();

      if (auth && firestore) {
        onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            try {
              const userRef = doc(firestore, 'users', fbUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                const profile = snap.data() as UserProfile;
                this.setCurrentUser(profile);
              }
            } catch (err) {
              console.error('Error cargando perfil de Firestore:', err);
            }
          } else if (!saved) {
            this.setCurrentUser(null);
          }
        });
      }
    }
  }

  get currentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  private setCurrentUser(user: UserProfile | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    this.currentUserSubject.next(user);
  }

  async login(email: string, pass: string): Promise<UserProfile> {
    email = email.trim().toLowerCase();

    // Si Firebase está activo
    if (this.fbService.isFirebaseConfigured) {
      const auth = this.fbService.getAuthInstance();
      const firestore = this.fbService.getFirestoreInstance();
      if (auth && firestore) {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const userRef = doc(firestore, 'users', cred.user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          this.setCurrentUser(profile);
          return profile;
        }
      }
    }

    // Fallback con almacenamiento local / cuentas demo
    const allUsers: UserProfile[] = this.allUsersSubject.value;
    const found = allUsers.find(u => u.email.toLowerCase() === email);

    if (found) {
      this.setCurrentUser(found);
      return found;
    }

    // Usuario no encontrado — lanzar error claro en lugar de auto-generar
    throw new Error('No existe una cuenta con ese correo. Verifica tus credenciales o regístrate.');
  }

  async register(
    email: string, 
    pass: string, 
    displayName: string, 
    role: UserRole, 
    specialistCodeInput?: string
  ): Promise<UserProfile> {
    email = email.trim().toLowerCase();
    const uid = 'user_' + Date.now();

    let specialistCode: string | undefined = undefined;
    let assignedDoctorId: string | undefined = undefined;
    let assignedDoctorName: string | undefined = undefined;

    const allUsers: UserProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ALL_USERS) || '[]');

    if (role === 'psicologo') {
      specialistCode = 'PSI-' + Math.floor(1000 + Math.random() * 9000);
    } else {
      // Paciente: vincular con doctor según código
      if (specialistCodeInput) {
        const docUser = allUsers.find(u => u.role === 'psicologo' && u.specialistCode === specialistCodeInput.trim().toUpperCase());
        if (docUser) {
          assignedDoctorId = docUser.uid;
          assignedDoctorName = docUser.displayName;
        } else {
          // Asignar por defecto a la Dra. Martha
          assignedDoctorId = 'doc_martha_01';
          assignedDoctorName = 'Dra. Martha Tegue';
        }
      } else {
        assignedDoctorId = 'doc_martha_01';
        assignedDoctorName = 'Dra. Martha Tegue';
      }
    }

    const profile: UserProfile = {
      uid,
      email,
      displayName: displayName || (role === 'psicologo' ? 'Especialista' : 'Paciente'),
      role,
      specialistCode,
      assignedDoctorId,
      assignedDoctorName,
      createdAt: new Date().toISOString()
    };

    // Si Firebase está activo
    if (this.fbService.isFirebaseConfigured) {
      const auth = this.fbService.getAuthInstance();
      const firestore = this.fbService.getFirestoreInstance();
      if (auth && firestore) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          profile.uid = cred.user.uid;
          await setDoc(doc(firestore, 'users', profile.uid), profile);
        } catch (e) {
          console.error('Error en registro Firebase:', e);
        }
      }
    }

    allUsers.push(profile);
    this.saveAllUsers(allUsers);
    this.setCurrentUser(profile);
    return profile;
  }

  async logout(): Promise<void> {
    if (this.fbService.isFirebaseConfigured) {
      const auth = this.fbService.getAuthInstance();
      if (auth) {
        try {
          await signOut(auth);
        } catch (e) {
          console.warn('Error en Firebase signOut:', e);
        }
      }
    }
    this.setCurrentUser(null);
  }

  // Inicio de sesión rápido para pruebas
  async loginAsDemoPatient(): Promise<UserProfile> {
    return this.login('paciente@innopsi.com', '123456');
  }

  async loginAsDemoDoctor(): Promise<UserProfile> {
    return this.login('doctor@innopsi.com', '123456');
  }

  async loginAsDemoAdmin(): Promise<UserProfile> {
    return this.login('admin@innopsi.com', '123456');
  }

  getAllPatients(): UserProfile[] {
    return this.allUsersSubject.value.filter(u => u.role === 'paciente');
  }

  getAllDoctors(): UserProfile[] {
    return this.allUsersSubject.value.filter(u => u.role === 'psicologo');
  }

  getAllUsers(): UserProfile[] {
    return this.allUsersSubject.value;
  }

  /** Retorna los pacientes asignados a un doctor específico */
  getPatientsForDoctor(doctorId: string): UserProfile[] {
    return this.allUsersSubject.value.filter(
      u => u.role === 'paciente' &&
           (u.assignedDoctorIds?.includes(doctorId) || u.assignedDoctorId === doctorId)
    );
  }

  /** Retorna los doctores asignados a un paciente específico */
  getDoctorsForPatient(patientId: string): UserProfile[] {
    const patient = this.allUsersSubject.value.find(u => u.uid === patientId);
    if (!patient) return [];
    const ids = patient.assignedDoctorIds ?? (patient.assignedDoctorId ? [patient.assignedDoctorId] : []);
    return this.allUsersSubject.value.filter(u => ids.includes(u.uid));
  }

  /** Admin: asigna un paciente a un doctor (agrega sin reemplazar) */
  assignPatientToDoctor(patientId: string, doctorId: string): void {
    const users = [...this.allUsersSubject.value];
    const patIdx = users.findIndex(u => u.uid === patientId);
    const doc    = users.find(u => u.uid === doctorId);
    if (patIdx === -1 || !doc) return;

    const patient = { ...users[patIdx] };
    const ids = [...(patient.assignedDoctorIds ?? (patient.assignedDoctorId ? [patient.assignedDoctorId] : []))];

    if (!ids.includes(doctorId)) {
      ids.push(doctorId);
    }

    patient.assignedDoctorIds  = ids;
    // Mantener compatibilidad con el campo singular (primer doctor)
    patient.assignedDoctorId   = ids[0];
    patient.assignedDoctorName = users.find(u => u.uid === ids[0])?.displayName;

    users[patIdx] = patient;
    this.saveAllUsers(users);

    // Si el paciente modificado es el usuario activo, actualizar sesión
    if (this.currentUserSubject.value?.uid === patientId) {
      this.setCurrentUser(patient);
    }
  }

  /** Admin: quita la asignación de un paciente con un doctor */
  removePatientFromDoctor(patientId: string, doctorId: string): void {
    const users  = [...this.allUsersSubject.value];
    const patIdx = users.findIndex(u => u.uid === patientId);
    if (patIdx === -1) return;

    const patient = { ...users[patIdx] };
    const ids = (patient.assignedDoctorIds ?? (patient.assignedDoctorId ? [patient.assignedDoctorId] : []))
      .filter(id => id !== doctorId);

    patient.assignedDoctorIds  = ids;
    patient.assignedDoctorId   = ids[0] ?? undefined;
    patient.assignedDoctorName = ids[0]
      ? users.find(u => u.uid === ids[0])?.displayName
      : undefined;

    users[patIdx] = patient;
    this.saveAllUsers(users);

    if (this.currentUserSubject.value?.uid === patientId) {
      this.setCurrentUser(patient);
    }
  }

  /**
   * Admin: crea un usuario nuevo (doctor o paciente) directamente,
   * sin pasar por el flujo de registro con contraseña real.
   * En modo demo/localStorage el password no se valida.
   */
  createUser(data: {
    displayName: string;
    email: string;
    role: 'paciente' | 'psicologo';
    specialistCode?: string;
    assignedDoctorIds?: string[];
  }): UserProfile {
    const users = [...this.allUsersSubject.value];

    // Verificar email duplicado
    if (users.find(u => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
      throw new Error('Ya existe un usuario con ese correo electrónico.');
    }

    const uid = 'user_' + Date.now();
    let specialistCode = data.specialistCode?.trim() || undefined;
    if (data.role === 'psicologo' && !specialistCode) {
      specialistCode = 'PSI-' + Math.floor(1000 + Math.random() * 9000);
    }

    const assignedIds = data.assignedDoctorIds ?? [];
    const firstDoc    = users.find(u => u.uid === assignedIds[0]);

    const newUser: UserProfile = {
      uid,
      email: data.email.trim().toLowerCase(),
      displayName: data.displayName.trim(),
      role: data.role,
      specialistCode,
      assignedDoctorIds:  data.role === 'paciente' ? assignedIds : undefined,
      assignedDoctorId:   data.role === 'paciente' ? assignedIds[0] : undefined,
      assignedDoctorName: data.role === 'paciente' ? firstDoc?.displayName : undefined,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveAllUsers(users);
    return newUser;
  }

  /**
   * Admin: edita los campos clave de cualquier usuario
   * (nombre, email, código especialista).
   */
  updateUserByAdmin(uid: string, changes: {
    displayName?: string;
    email?: string;
    specialistCode?: string;
  }): void {
    const users = [...this.allUsersSubject.value];
    const idx   = users.findIndex(u => u.uid === uid);
    if (idx === -1) return;

    // Verificar email duplicado (excluyendo al propio usuario)
    if (changes.email) {
      const emailLower = changes.email.trim().toLowerCase();
      const conflict   = users.find(u => u.email.toLowerCase() === emailLower && u.uid !== uid);
      if (conflict) throw new Error('Ese correo ya está en uso por otro usuario.');
    }

    const updated = { ...users[idx] };
    if (changes.displayName !== undefined) updated.displayName    = changes.displayName.trim();
    if (changes.email       !== undefined) updated.email          = changes.email.trim().toLowerCase();
    if (changes.specialistCode !== undefined && updated.role === 'psicologo') {
      updated.specialistCode = changes.specialistCode.trim().toUpperCase();
    }

    // Si el nombre cambia, actualizar assignedDoctorName en sus pacientes
    if (changes.displayName && updated.role === 'psicologo') {
      users.forEach((u, i) => {
        if (u.role === 'paciente' && u.assignedDoctorIds?.includes(uid)) {
          users[i] = {
            ...u,
            assignedDoctorName: updated.displayName
          };
        }
      });
    }

    users[idx] = updated;
    this.saveAllUsers(users);

    // Actualizar sesión si es el usuario activo
    if (this.currentUserSubject.value?.uid === uid) {
      this.setCurrentUser(updated);
    }
  }

  /**
   * Admin: elimina un usuario. Si es doctor, desvincula sus pacientes.
   * No permite eliminar admins ni al propio usuario activo.
   */
  deleteUser(uid: string): void {
    const current = this.currentUserSubject.value;
    if (current?.uid === uid) throw new Error('No puedes eliminarte a ti mismo.');

    let users = [...this.allUsersSubject.value];
    const target = users.find(u => u.uid === uid);
    if (!target) return;
    if (target.role === 'admin') throw new Error('No se pueden eliminar cuentas de administrador.');

    // Si era doctor → quitar de assignedDoctorIds de sus pacientes
    if (target.role === 'psicologo') {
      users = users.map(u => {
        if (u.role !== 'paciente') return u;
        const ids = (u.assignedDoctorIds ?? []).filter(id => id !== uid);
        return {
          ...u,
          assignedDoctorIds:  ids,
          assignedDoctorId:   ids[0] ?? undefined,
          assignedDoctorName: ids[0]
            ? users.find(d => d.uid === ids[0])?.displayName
            : undefined
        };
      });
    }

    users = users.filter(u => u.uid !== uid);
    this.saveAllUsers(users);
  }

  /**
   * Actualiza displayName y/o photoUrl del usuario en localStorage
   * y en Firestore si Firebase está activo.
   */
  async updateProfile(uid: string, changes: { displayName?: string; photoUrl?: string }): Promise<void> {
    // 1. Actualizar en la lista global de usuarios
    const allUsers: UserProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ALL_USERS) || '[]');
    const idx = allUsers.findIndex(u => u.uid === uid);
    if (idx !== -1) {
      if (changes.displayName !== undefined) allUsers[idx].displayName = changes.displayName;
      if (changes.photoUrl    !== undefined) allUsers[idx].photoUrl    = changes.photoUrl;
      this.saveAllUsers(allUsers);
    }

    // 2. Actualizar el usuario activo en sesión
    const current = this.currentUserSubject.value;
    if (current && current.uid === uid) {
      const updated: UserProfile = {
        ...current,
        ...(changes.displayName !== undefined && { displayName: changes.displayName }),
        ...(changes.photoUrl    !== undefined && { photoUrl:    changes.photoUrl    })
      };
      this.setCurrentUser(updated);
    }

    // 3. Sincronizar con Firestore si está disponible
    if (this.fbService.isFirebaseConfigured) {
      const db = this.fbService.getFirestoreInstance();
      if (db) {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const payload: Record<string, string> = {};
          if (changes.displayName !== undefined) payload['displayName'] = changes.displayName;
          // No guardar dataURLs grandes en Firestore — solo URLs externas
          if (changes.photoUrl !== undefined && !changes.photoUrl.startsWith('data:')) {
            payload['photoUrl'] = changes.photoUrl;
          }
          if (Object.keys(payload).length > 0) {
            await updateDoc(doc(db, 'users', uid), payload);
          }
        } catch (e) {
          console.warn('Error actualizando perfil en Firestore:', e);
        }
      }
    }
  }
}
