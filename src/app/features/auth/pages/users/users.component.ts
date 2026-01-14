import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';

type UserItem = {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type UsersResponse = {
  message: string;
  data: UserItem[];
  pagination: Pagination;
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';
  private endpoint = '/users';

  loading = false;
  errorMsg = '';

  users: UserItem[] = [];
  pagination: Pagination | null = null;

  // ===== Filter Model (UI) =====
  fName = '';
  fUsername = '';
  fRole = 'ALL';
  fActive = 'ALL'; // ALL | ACTIVE | INACTIVE
  fVerified = 'ALL'; // ALL | VERIFIED | UNVERIFIED

  // dropdown role (diisi dari response)
  roleOptions: string[] = ['ALL'];

  // pagination
  page = 1;
  limit = 10;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUsers(true);
  }

  private buildHeaders(): HttpHeaders | undefined {
  const token = localStorage.getItem('accessToken'); // ✅ key sesuai localStorage kamu
  if (!token) return undefined;
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
}

  // Build query params ke backend (sesuai tab Params di Postman)
  private buildParams(resetPage: boolean): HttpParams {
    if (resetPage) this.page = 1;

    let params = new HttpParams()
      .set('page', String(this.page))
      .set('limit', String(this.limit));

    // name, username
    if (this.fName.trim()) params = params.set('name', this.fName.trim());
    if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());

    // role
    if (this.fRole !== 'ALL') params = params.set('role', this.fRole);

    // active status
    // backend umumnya pakai isActive=true/false
    if (this.fActive === 'ACTIVE') params = params.set('isActive', 'true');
    if (this.fActive === 'INACTIVE') params = params.set('isActive', 'false');

    // verified
    if (this.fVerified === 'VERIFIED') params = params.set('isVerified', 'true');
    if (this.fVerified === 'UNVERIFIED') params = params.set('isVerified', 'false');

    return params;
  }

  fetchUsers(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const headers = this.buildHeaders();
    const params = this.buildParams(resetPage);

    this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, { headers, params })
      .subscribe({
        next: (res) => {
            console.log('Fetched users:', res);
          this.users = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.buildRoleOptions();
          this.loading = false;
        },
        error: (err) => {
  console.error('Error fetching users:', err);
  this.loading = false;
  this.users = [];
  this.pagination = null;

  if (err?.status === 401) {
    this.errorMsg = 'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
    return;
  }

  this.errorMsg = `Gagal fetch users dari API (HTTP ${err?.status || 'unknown'}).`;
},
      });
  }

  buildRoleOptions(): void {
    const set = new Set<string>();
    for (const u of this.users) {
      for (const r of u.roles || []) set.add(r);
    }
    this.roleOptions = ['ALL', ...Array.from(set).sort()];
  }

  // UI actions
  applyFilters(): void {
    this.fetchUsers(true);
  }

  resetFilters(): void {
    this.fName = '';
    this.fUsername = '';
    this.fRole = 'ALL';
    this.fActive = 'ALL';
    this.fVerified = 'ALL';
    this.fetchUsers(true);
  }

  // pagination controls
  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchUsers(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchUsers(false);
  }

  // actions (placeholder)
  editUser(u: UserItem): void {
    console.log('edit user', u);
  }

  trackById(_: number, item: UserItem) {
    return item.id;
  }
}
