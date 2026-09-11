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

  private defaultUsers: UserProfile[] = [
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
      localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(this.defaultUsers));
    }
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
    const allUsers: UserProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ALL_USERS) || '[]');
    const found = allUsers.find(u => u.email.toLowerCase() === email);

    if (found) {
      this.setCurrentUser(found);
      return found;
    }

    // Auto-generar perfil si es nueva sesión de prueba
    const newDemoUser: UserProfile = {
      uid: 'user_' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
      role: 'paciente',
      assignedDoctorId: 'doc_martha_01',
      assignedDoctorName: 'Dra. Martha Tegue',
      createdAt: new Date().toISOString()
    };
    allUsers.push(newDemoUser);
    localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(allUsers));
    this.setCurrentUser(newDemoUser);
    return newDemoUser;
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
    localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(allUsers));
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

  getAllPatients(): UserProfile[] {
    const allUsers: UserProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ALL_USERS) || '[]');
    return allUsers.filter(u => u.role === 'paciente');
  }

  getAllDoctors(): UserProfile[] {
    const allUsers: UserProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ALL_USERS) || '[]');
    return allUsers.filter(u => u.role === 'psicologo');
  }
}
