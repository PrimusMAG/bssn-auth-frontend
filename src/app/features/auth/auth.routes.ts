import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TotpComponent } from './pages/totp/totp.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component'; // 
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component'; // 
import { AppShellLayoutComponent } from '../../shared/components/app-shell-layout/app-shell-layout.component';
import { UsersComponent } from './pages/users/users.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'totp', component: TotpComponent },
  { path: 'edit-profile', component: EditProfileComponent },
  {path: 'profile', component: ProfileComponent},
  {
    path: '',
    component: AppShellLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
    ],
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

