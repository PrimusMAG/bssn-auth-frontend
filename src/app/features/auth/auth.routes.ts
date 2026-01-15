import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TotpComponent } from './pages/totp/totp.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { AppShellLayoutComponent } from '../../shared/components/app-shell-layout/app-shell-layout.component';
import { UsersComponent } from './pages/users/users.component';
import { SessionComponent } from './pages/session/session.component';
import { UnitKerjaComponent } from './pages/unit-kerja/unit-kerja.component';
import { KonteksComponent } from './pages/konteks/konteks.component';
import { KonteksDetailComponent } from './pages/konteks-detail/konteks-detail.component';

export const AUTH_ROUTES: Routes = [
  // ✅ halaman tanpa layout (tanpa sidebar)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'totp', component: TotpComponent },
  { path: 'konteks/:konteksId', component: KonteksDetailComponent },

  {
    path: '',
    component: AppShellLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'unit-kerja', component: UnitKerjaComponent },
      { path: 'session', component: SessionComponent },
      { path: 'konteks', component: KonteksComponent },
      // profile/edit-profile taruh di dalam layout supaya sidebar tetap ada
      { path: 'profile', component: ProfileComponent },
      { path: 'edit-profile', component: EditProfileComponent },

      // default ketika masuk /auth (sesudah login)
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // default global kalau cuma /auth -> /auth/login
  // (opsional, tapi aman kalau ada yang akses /auth langsung dari luar state login)
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
