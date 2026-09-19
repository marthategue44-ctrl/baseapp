import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { UserProfile } from '../models/app.models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  unreadCount: number = 0;
  /** Lista de especialistas asignados al paciente */
  assignedDoctors: UserProfile[] = [];

  private userSub!: Subscription;
  private chatSub!: Subscription;
  private allUsersSub!: Subscription;

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && user.role === 'psicologo') {
        this.router.navigate(['/specialist-dashboard']);
        return;
      }
      if (user && user.role === 'admin') {
        this.router.navigate(['/admin-dashboard']);
        return;
      }
      if (user) {
        this.refreshUnread(user);
        this.refreshDoctors(user);
      }
    });

    // Refrescar badge cuando lleguen mensajes nuevos
    this.chatSub = this.dataService.chatMessages$.subscribe(() => {
      if (this.currentUser) this.refreshUnread(this.currentUser);
    });

    // Refrescar lista de doctores cuando el admin cambie asignaciones
    this.allUsersSub = this.authService.allUsers$.subscribe(() => {
      if (this.currentUser) this.refreshDoctors(this.currentUser);
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
    this.chatSub?.unsubscribe();
    this.allUsersSub?.unsubscribe();
  }

  private refreshUnread(user: UserProfile) {
    this.unreadCount = this.dataService.getUnreadCount(user.uid, user.uid);
  }

  private refreshDoctors(user: UserProfile) {
    this.assignedDoctors = this.authService.getDoctorsForPatient(user.uid);
  }

  goTo(route: string) {
    this.router.navigate(['/' + route]);
  }

  goToEditProfile() {
    this.router.navigate(['/edit-profile']);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
