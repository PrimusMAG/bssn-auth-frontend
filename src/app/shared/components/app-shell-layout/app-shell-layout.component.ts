import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-shell-layout.component.html',
  styleUrls: ['./app-shell-layout.component.scss'],
})
export class AppShellLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  dropdownOpen = false;

  displayName = 'User';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // ambil username yang kamu simpan di localStorage
    const u = localStorage.getItem('auth_username');
    if (u) this.displayName = u;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goEditProfile() {
    this.dropdownOpen = false;
    this.router.navigate(['/auth/edit-profile']);
  }

  logout() {
    // hapus token (sesuaikan dengan key kamu)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('auth_username');
    this.dropdownOpen = false;
    this.router.navigate(['/auth/login']);
  }
}
