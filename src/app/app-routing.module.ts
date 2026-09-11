import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'medication-schedule',
    loadChildren: () => import('./pages/medication-schedule/medication-schedule.module').then(m => m.MedicationSchedulePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'emotional-state',
    loadChildren: () => import('./pages/emotional-state/emotional-state.module').then(m => m.EmotionalStatePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'diary',
    loadChildren: () => import('./pages/diary/diary.module').then(m => m.DiaryPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'chat',
    loadChildren: () => import('./pages/chat/chat.module').then(m => m.ChatPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'specialist-dashboard',
    loadChildren: () => import('./pages/specialist-dashboard/specialist-dashboard.module').then(m => m.SpecialistDashboardPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
