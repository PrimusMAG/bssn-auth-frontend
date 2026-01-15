import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';

type KonteksItem = {
  id: string;
  name: string;
  code: string;
  description: string;
  periodStart: number;
  periodEnd: number;
  matrixSize: number;
  riskAppetiteLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskAppetiteDescription: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  _count?: {
    riskCategories: number;
    riskMatrices: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type KonteksResponse = {
  message: string;
  data: KonteksItem[];
  pagination: Pagination;
};

type EditKonteksModel = {
  id: string;
  name: string;
  code: string;
  description: string;
  periodStart: number | null;
  periodEnd: number | null;
  matrixSize: number; // 4/5
  riskAppetiteLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskAppetiteDescription: string;
  isActive: boolean;
};

type PatchKonteksPayload = {
  name: string;
  code: string;
  description: string;
  periodStart: number;
  periodEnd: number;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
  isActive: boolean;
};

@Component({
  selector: 'app-konteks',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './konteks.component.html',
  styleUrl: './konteks.component.scss',
})
export class KonteksComponent implements OnInit {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';
  private endpoint = '/konteks';

  loading = false;
  errorMsg = '';

  // list utama (yang ditampilkan)
  items: KonteksItem[] = [];
  pagination: Pagination | null = null;

  // ===== Summary Counts (Stats Row) =====
  totalKonteks = 0;
  totalAktif = 0;
  totalNonAktif = 0;

  // ===== Filter Model (UI) =====
  fName = '';
  fCode = '';
  fPeriode = 'ALL'; // year
  fRiskAppetite = 'ALL'; // HIGH/MEDIUM/LOW
  fMatrixSize = 'ALL'; // 4/5
  fActive = 'ALL'; // ALL | ACTIVE | INACTIVE

  periodeOptions: (string | number)[] = ['ALL'];
  appetiteOptions: string[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
  matrixOptions: (string | number)[] = ['ALL', 4, 5];

  // pagination
  page = 1;
  limit = 10;

  // ===== Edit Modal =====
  showEditModal = false;
  editError = '';

  editModel: EditKonteksModel = {
    id: '',
    name: '',
    code: '',
    description: '',
    periodStart: null,
    periodEnd: null,
    matrixSize: 5,
    riskAppetiteLevel: 'LOW',
    riskAppetiteDescription: '',
    isActive: false,
  };

  constructor(private http: HttpClient, private router: Router) {}


  openKonteksDetail(k: any): void {
  this.router.navigate(['/auth/konteks', k.id]);
}

  ngOnInit(): void {
    this.fetchKonteks(true);
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

  // Build params (kalau backend support filters via query params, tinggal aktifkan yang perlu)
  private buildParams(resetPage: boolean): HttpParams {
    if (resetPage) this.page = 1;

    let params = new HttpParams()
      .set('page', String(this.page))
      .set('limit', String(this.limit));

    // OPTIONAL (kalau backend kamu sudah support filter query):
    // if (this.fName.trim()) params = params.set('name', this.fName.trim());
    // if (this.fCode.trim()) params = params.set('code', this.fCode.trim());
    // if (this.fRiskAppetite !== 'ALL') params = params.set('riskAppetiteLevel', this.fRiskAppetite);
    // if (this.fMatrixSize !== 'ALL') params = params.set('matrixSize', String(this.fMatrixSize));
    // if (this.fActive === 'ACTIVE') params = params.set('isActive', 'true');
    // if (this.fActive === 'INACTIVE') params = params.set('isActive', 'false');
    // if (this.fPeriode !== 'ALL') params = params.set('period', String(this.fPeriode));

    return params;
  }

  // Stats params: ngikut filters, tapi page/limit kecil
  private buildStatsParams(activeOverride: 'true' | 'false' | null): HttpParams {
    let params = new HttpParams().set('page', '1').set('limit', '1');

    // OPTIONAL (kalau backend support):
    // if (this.fName.trim()) params = params.set('name', this.fName.trim());
    // if (this.fCode.trim()) params = params.set('code', this.fCode.trim());
    // if (this.fRiskAppetite !== 'ALL') params = params.set('riskAppetiteLevel', this.fRiskAppetite);
    // if (this.fMatrixSize !== 'ALL') params = params.set('matrixSize', String(this.fMatrixSize));
    // if (this.fPeriode !== 'ALL') params = params.set('period', String(this.fPeriode));

    // kalau backend sudah support filter aktif:
    if (activeOverride) params = params.set('isActive', activeOverride);

    return params;
  }

  private buildPeriodeOptionsFromData(list: KonteksItem[]): void {
    const years = new Set<number>();
    for (const k of list) {
      if (typeof k.periodStart === 'number') years.add(k.periodStart);
      if (typeof k.periodEnd === 'number') years.add(k.periodEnd);
    }
    const sorted = Array.from(years).sort((a, b) => a - b);
    this.periodeOptions = ['ALL', ...sorted];
  }

  // client-side filter: supaya UX tetap jalan walaupun backend belum support filter params
  private applyClientFilters(list: KonteksItem[]): KonteksItem[] {
    const nameQ = this.fName.trim().toLowerCase();
    const codeQ = this.fCode.trim().toLowerCase();

    return (list ?? []).filter((k) => {
      if (nameQ && !(k.name ?? '').toLowerCase().includes(nameQ)) return false;
      if (codeQ && !(k.code ?? '').toLowerCase().includes(codeQ)) return false;

      if (this.fRiskAppetite !== 'ALL' && (k.riskAppetiteLevel ?? '') !== this.fRiskAppetite) {
        return false;
      }

      if (this.fMatrixSize !== 'ALL' && String(k.matrixSize) !== String(this.fMatrixSize)) {
        return false;
      }

      if (this.fActive === 'ACTIVE' && !k.isActive) return false;
      if (this.fActive === 'INACTIVE' && k.isActive) return false;

      if (this.fPeriode !== 'ALL') {
        const y = Number(this.fPeriode);
        if (!(k.periodStart <= y && y <= k.periodEnd)) return false;
      }

      return true;
    });
  }

  private refreshStatsClient(filtered: KonteksItem[]): void {
    this.totalKonteks = filtered.length;
    this.totalAktif = filtered.filter((x) => x.isActive).length;
    this.totalNonAktif = filtered.filter((x) => !x.isActive).length;
  }

  // OPTIONAL: kalau backend sudah support isActive filter (true/false), stats lebih akurat cross-page
  private refreshKonteksStatsFromBackend(): void {
    const headers = this.buildHeaders();

    const total$ = this.http
      .get<KonteksResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams(null),
      })
      .pipe(map((r) => r?.pagination?.totalItems ?? 0), catchError(() => of(0)));

    const active$ = this.http
      .get<KonteksResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams('true'),
      })
      .pipe(map((r) => r?.pagination?.totalItems ?? 0), catchError(() => of(0)));

    const inactive$ = this.http
      .get<KonteksResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams('false'),
      })
      .pipe(map((r) => r?.pagination?.totalItems ?? 0), catchError(() => of(0)));

    forkJoin({ total: total$, active: active$, inactive: inactive$ }).subscribe((r) => {
      // hanya update kalau response bukan 0 semua karena error
      this.totalKonteks = r.total;
      this.totalAktif = r.active;
      this.totalNonAktif = r.inactive;
    });
  }

  fetchKonteks(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const headers = this.buildHeaders();
    const params = this.buildParams(resetPage);

    this.http
      .get<KonteksResponse>(`${this.baseUrl}${this.endpoint}`, { headers, params })
      .subscribe({
        next: (res) => {
          const raw = res.data ?? [];

          // periode options dari raw supaya dropdownnya lengkap
          this.buildPeriodeOptionsFromData(raw);

          // apply filter client-side biar UX sama kayak users
          const filtered = this.applyClientFilters(raw);
          this.items = filtered;

          // stats client (sesuai filter + page ini)
          this.refreshStatsClient(filtered);

          // pagination tetap dari backend
          this.pagination = res.pagination ?? null;

          // OPTIONAL: kalau backend support stats lebih akurat, aktifkan:
          // this.refreshKonteksStatsFromBackend();

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching konteks:', err);
          this.loading = false;
          this.items = [];
          this.pagination = null;

          this.totalKonteks = 0;
          this.totalAktif = 0;
          this.totalNonAktif = 0;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            return;
          }

          this.errorMsg = `Gagal fetch konteks dari API (HTTP ${err?.status || 'unknown'}).`;
        },
      });
  }

  applyFilters(): void {
    this.fetchKonteks(true);
  }

  resetFilters(): void {
    this.fName = '';
    this.fCode = '';
    this.fPeriode = 'ALL';
    this.fRiskAppetite = 'ALL';
    this.fMatrixSize = 'ALL';
    this.fActive = 'ALL';
    this.fetchKonteks(true);
  }

  // pagination controls
  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchKonteks(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchKonteks(false);
  }

  // ===================== EDIT KONTEKS (MODAL) =====================
  editKonteks(k: KonteksItem): void {
    this.editError = '';

    this.editModel = {
      id: k.id,
      name: k.name ?? '',
      code: k.code ?? '',
      description: k.description ?? '',
      periodStart: typeof k.periodStart === 'number' ? k.periodStart : null,
      periodEnd: typeof k.periodEnd === 'number' ? k.periodEnd : null,
      matrixSize: k.matrixSize ?? 5,
      riskAppetiteLevel: k.riskAppetiteLevel ?? 'LOW',
      riskAppetiteDescription: k.riskAppetiteDescription ?? '',
      isActive: !!k.isActive,
    };

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editError = '';
  }

  private isValidCode(v: string): boolean {
    // sederhana: uppercase + underscore + angka (boleh kamu longgarkan)
    return /^[A-Z0-9_]+$/.test(v.trim());
  }

  saveEditKonteks(): void {
    this.editError = '';

    if (!this.editModel.name.trim()) {
      this.editError = 'Nama konteks wajib diisi.';
      return;
    }

    if (!this.editModel.code.trim()) {
      this.editError = 'Kode konteks wajib diisi.';
      return;
    }

    if (!this.isValidCode(this.editModel.code)) {
      this.editError = 'Kode hanya boleh huruf besar, angka, dan underscore. Contoh: RISK_2026';
      return;
    }

    const ps = Number(this.editModel.periodStart);
    const pe = Number(this.editModel.periodEnd);

    if (!ps || !pe) {
      this.editError = 'Periode mulai dan akhir wajib diisi.';
      return;
    }
    if (ps > pe) {
      this.editError = 'Periode mulai tidak boleh lebih besar dari periode akhir.';
      return;
    }

    if (![4, 5].includes(Number(this.editModel.matrixSize))) {
      this.editError = 'Ukuran matriks hanya mendukung 4 atau 5.';
      return;
    }

    if (!this.editModel.riskAppetiteLevel) {
      this.editError = 'Risk appetite level wajib dipilih.';
      return;
    }

    const headers = this.buildHeaders();
    if (!headers) {
      this.editError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: PatchKonteksPayload = {
      name: this.editModel.name.trim(),
      code: this.editModel.code.trim(),
      description: (this.editModel.description ?? '').trim(),
      periodStart: ps,
      periodEnd: pe,
      matrixSize: Number(this.editModel.matrixSize),
      riskAppetiteLevel: String(this.editModel.riskAppetiteLevel),
      riskAppetiteDescription: (this.editModel.riskAppetiteDescription ?? '').trim(),
      isActive: !!this.editModel.isActive,
    };

    this.loading = true;

    this.http
      .patch<any>(`${this.baseUrl}${this.endpoint}/${this.editModel.id}`, payload, { headers })
      .subscribe({
        next: () => {
          // update table lokal biar langsung berubah
          this.items = this.items.map((x) =>
            x.id === this.editModel.id
              ? {
                  ...x,
                  ...payload,
                }
              : x
          );

          // refresh stats client
          this.refreshStatsClient(this.items);

          this.loading = false;
          this.closeEditModal();
        },
        error: (e) => {
          this.loading = false;
          this.editError =
            e?.error?.errors || e?.error?.message || 'Gagal update konteks. Coba lagi.';
          console.error('[PATCH /konteks/:id] error:', e);
        },
      });
  }

  trackById(_: number, item: KonteksItem) {
    return item.id;
  }

  // helpers ui
  appetiteBadgeClass(v: string): string {
    if (v === 'HIGH') return 'red';
    if (v === 'MEDIUM') return 'orange';
    if (v === 'LOW') return 'green';
    return 'gray';
  }

  matrixLabel(size: number): string {
    const s = size ?? 0;
    return `${s} × ${s}`;
  }
}
