import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserProfile } from '../models/app.models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentUser: UserProfile | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Si el usuario es psicólogo, redirigirlo a su panel de especialista
      if (user && user.role === 'psicologo') {
        this.router.navigate(['/specialist-dashboard']);
      }
    });
  }

  goTo(route: string) {
    this.router.navigate(['/' + route]);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
