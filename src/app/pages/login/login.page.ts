import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { UserRole } from '../../models/app.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  mode: 'login' | 'register' = 'login';
  selectedRole: UserRole = 'paciente';

  email = '';
  password = '';
  displayName = '';
  specialistCodeInput = '';

  loading = false;
  errorMessage = '';
  isFirebaseLive = false;

  constructor(
    private authService: AuthService,
    private fbService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.isFirebaseLive = this.fbService.isFirebaseConfigured;
    // Si ya está logueado, redirigir
    const user = this.authService.currentUser;
    if (user) {
      this.redirectUser(user.role);
    }
  }

  async onSubmit() {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor completa correo y contraseña.';
      return;
    }

    this.loading = true;
    try {
      if (this.mode === 'login') {
        const user = await this.authService.login(this.email, this.password);
        this.redirectUser(user.role);
      } else {
        const user = await this.authService.register(
          this.email,
          this.password,
          this.displayName,
          this.selectedRole,
          this.specialistCodeInput
        );
        this.redirectUser(user.role);
      }
    } catch (err: any) {
      console.error(err);
      this.errorMessage = err.message || 'Error al autenticar. Verifica tus credenciales.';
    } finally {
      this.loading = false;
    }
  }

  async quickLoginPatient() {
    this.loading = true;
    try {
      const user = await this.authService.loginAsDemoPatient();
      this.redirectUser(user.role);
    } catch (e: any) {
      this.errorMessage = e.message;
    } finally {
      this.loading = false;
    }
  }

  async quickLoginDoctor() {
    this.loading = true;
    try {
      const user = await this.authService.loginAsDemoDoctor();
      this.redirectUser(user.role);
    } catch (e: any) {
      this.errorMessage = e.message;
    } finally {
      this.loading = false;
    }
  }

  private redirectUser(role: UserRole) {
    if (role === 'psicologo') {
      this.router.navigate(['/specialist-dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
