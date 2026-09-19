import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/app.models';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false
})
export class EditProfilePage implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  currentUser: UserProfile | null = null;
  displayName: string = '';
  previewUrl: string | null = null;
  isSaving: boolean = false;
  savedOk: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.displayName = this.currentUser.displayName;
    this.previewUrl  = this.currentUser.photoUrl || null;
  }

  get backRoute(): string {
    return this.currentUser?.role === 'psicologo' ? '/specialist-dashboard' : '/home';
  }

  /** Abre el selector de archivos nativo */
  triggerFilePicker(): void {
    this.fileInput?.nativeElement?.click();
  }

  /** Convierte la imagen seleccionada a dataURL y la muestra como preview */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Solo imágenes, máx 5 MB
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async saveChanges(): Promise<void> {
    if (!this.currentUser) return;
    const name = this.displayName.trim();
    if (!name) return;

    this.isSaving = true;
    this.savedOk  = false;

    try {
      await this.authService.updateProfile(this.currentUser.uid, {
        displayName: name,
        photoUrl: this.previewUrl ?? undefined
      });

      // Recargar usuario desde el servicio para reflejar cambios
      this.currentUser = this.authService.currentUser;
      this.savedOk = true;
      setTimeout(() => {
        this.savedOk = false;
        this.router.navigate([this.backRoute]);
      }, 1800);
    } catch (err) {
      console.error('Error guardando perfil:', err);
    } finally {
      this.isSaving = false;
    }
  }

  goBack(): void {
    this.router.navigate([this.backRoute]);
  }
}
