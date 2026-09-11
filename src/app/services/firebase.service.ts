import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  public isFirebaseConfigured: boolean = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    if (environment.firebase && environment.firebase.apiKey && environment.firebase.apiKey.trim().length > 5) {
      try {
        if (!getApps().length) {
          this.app = initializeApp(environment.firebase);
        } else {
          this.app = getApps()[0];
        }
        this.auth = getAuth(this.app);
        this.firestore = getFirestore(this.app);
        this.isFirebaseConfigured = true;
        console.log('[InnoPsi] Conectado exitosamente con Firebase Live.');
      } catch (error) {
        console.warn('[InnoPsi] Error inicializando Firebase SDK:', error);
        this.isFirebaseConfigured = false;
      }
    } else {
      console.log('[InnoPsi] Modo Demo / LocalStorage activo (Sin API Key en environment.ts). La app funciona con datos preconfigurados.');
      this.isFirebaseConfigured = false;
    }
  }

  getAuthInstance(): Auth | null {
    return this.auth;
  }

  getFirestoreInstance(): Firestore | null {
    return this.firestore;
  }
}
