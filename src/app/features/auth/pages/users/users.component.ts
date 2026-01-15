import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

type EditUserModel = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  roles: { USER: boolean; ADMIN: boolean };
};

type PatchUserPayload = {
  email: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
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

  // ===== Summary Counts (User Stats) =====
  totalUsers = 0;
  totalActive = 0;
  totalInactive = 0;

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

  // ===== Edit Modal =====
  showEditModal = false;
  editError = '';

  editModel: EditUserModel = {
    id: '',
    email: '',
    name: '',
    isActive: false,
    isVerified: false,
    roles: { USER: true, ADMIN: false },
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUsers(true);
  }

  private buildHeaders(): HttpHeaders | undefined {
    const token =
      localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    if (!token) return undefined;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private isValidEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  // Build query params ke backend (sesuai tab Params di Postman)
  private buildParams(resetPage: boolean): HttpParams {
    if (resetPage) this.page = 1;

    let params = new HttpParams()
      .set('page', String(this.page))
      .set('limit', String(this.limit));

    if (this.fName.trim()) params = params.set('name', this.fName.trim());
    if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());

    if (this.fRole !== 'ALL') params = params.set('role', this.fRole);

    if (this.fActive === 'ACTIVE') params = params.set('isActive', 'true');
    if (this.fActive === 'INACTIVE') params = params.set('isActive', 'false');

    if (this.fVerified === 'VERIFIED') params = params.set('isVerified', 'true');
    if (this.fVerified === 'UNVERIFIED') params = params.set('isVerified', 'false');

    return params;
  }

  // Params khusus untuk Stats: mengikuti filter (name/username/role/verified)
  // tapi active di-override agar bisa hitung total/active/inactive.
  private buildStatsParams(activeOverride: 'true' | 'false' | null): HttpParams {
    let params = new HttpParams().set('page', '1').set('limit', '1');

    if (this.fName.trim()) params = params.set('name', this.fName.trim());
    if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());
    if (this.fRole !== 'ALL') params = params.set('role', this.fRole);

    if (this.fVerified === 'VERIFIED') params = params.set('isVerified', 'true');
    if (this.fVerified === 'UNVERIFIED') params = params.set('isVerified', 'false');

    if (activeOverride) params = params.set('isActive', activeOverride);

    return params;
  }

  private refreshUserStats(): void {
    const headers = this.buildHeaders();

    const total$ = this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams(null),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    const active$ = this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams('true'),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    const inactive$ = this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams('false'),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    forkJoin({ total: total$, active: active$, inactive: inactive$ }).subscribe((r) => {
      this.totalUsers = r.total;
      this.totalActive = r.active;
      this.totalInactive = r.inactive;
    });
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
          this.users = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.buildRoleOptions();

          // ✅ update stats berdasarkan filter saat ini (name/username/role/verified)
          this.refreshUserStats();

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching users:', err);
          this.loading = false;
          this.users = [];
          this.pagination = null;

          // reset stats biar ga nyangkut angka lama
          this.totalUsers = 0;
          this.totalActive = 0;
          this.totalInactive = 0;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
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

  // ===================== EDIT USER (MODAL) =====================
  editUser(u: UserItem): void {
    this.editError = '';

    this.editModel = {
      id: u.id,
      email: u.email ?? '',
      name: u.name ?? '',
      isActive: !!u.isActive,
      isVerified: !!u.isVerified,
      roles: {
        USER: (u.roles ?? []).includes('USER'),
        ADMIN: (u.roles ?? []).includes('ADMIN'),
      },
    };

    // minimal 1 role
    if (!this.editModel.roles.USER && !this.editModel.roles.ADMIN) {
      this.editModel.roles.USER = true;
    }

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editError = '';
  }

  saveEditUser(): void {
    this.editError = '';

    if (!this.editModel.name.trim()) {
      this.editError = 'Name wajib diisi.';
      return;
    }

    if (!this.isValidEmail(this.editModel.email)) {
      this.editError = 'Email tidak valid.';
      return;
    }

    const roles: string[] = [];
    if (this.editModel.roles.USER) roles.push('USER');
    if (this.editModel.roles.ADMIN) roles.push('ADMINISTRATOR');

    if (roles.length === 0) {
      this.editError = 'Minimal pilih 1 role.';
      return;
    }

    const headers = this.buildHeaders();
    if (!headers) {
      this.editError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: PatchUserPayload = {
      email: this.editModel.email.trim(),
      name: this.editModel.name.trim(),
      isActive: !!this.editModel.isActive,
      isVerified: !!this.editModel.isVerified,
      roles,
    };

    this.loading = true;

    this.http
      .patch<any>(`${this.baseUrl}${this.endpoint}/${this.editModel.id}`, payload, { headers })
      .subscribe({
        next: () => {
          // update table lokal biar langsung berubah
          this.users = this.users.map((x) =>
            x.id === this.editModel.id ? { ...x, ...payload } : x
          );

          // ✅ setelah edit, refresh stats juga
          this.refreshUserStats();

          this.loading = false;
          this.closeEditModal();
        },
        error: (e) => {
          this.loading = false;
          this.editError =
            e?.error?.errors || e?.error?.message || 'Gagal update user. Coba lagi.';
          console.error('[PATCH /users/:id] error:', e);
        },
      });
  }

  trackById(_: number, item: UserItem) {
    return item.id;
  }
}
