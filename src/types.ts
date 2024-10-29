export interface Teacher {
  id: string;
  name: string;
  code: string;
  isDeleted?: boolean;
}

export interface RosterEntry {
  id: string;
  teacherId: string;
  classId: string;
  dayOfWeek: DayOfWeek;
  hours: number[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  rosterId: string;
  date: string;
  presentHours: number[];
  keterangan: string;
}

export interface Student {
  id: string;
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  class: string;
  barak: string;
  photoUrl?: string; // Tambah field untuk foto profil
  isDeleted?: boolean;
}

export interface StudentLeaveRequest {
  id: string;
  studentId: string;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export const daySchedule: Record<DayOfWeek, number> = {
  Senin: 8,
  Selasa: 8,
  Rabu: 8,
  Kamis: 8,
  Jumat: 6,
  Sabtu: 7
};

export const availableClasses = [
  'X-1', 'X-2', 'X-3', 'X-4', 'X-5', 'X-6',
  'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XI-5', 'XI-6',
  'XII-1', 'XII-2', 'XII-3', 'XII-4', 'XII-5', 'XII-6'
];

export type LeaveType = 'Sakit' | 'Izin' | 'Pulang' | 'Tanpa Keterangan' | 'Lomba';
export type ReturnStatus = 'Sudah Kembali' | 'Belum Kembali';

export interface StudentLeave {
  id: string;
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  keterangan: string;
  documentUrl?: string;
  returnStatus?: ReturnStatus;
}

export type UserRole = 'admin_master' | 'admin' | 'piket' | 'wakil_kepala' | 'pengasuh' | 'admin_asrama' | 'admin_barak';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  asramaId?: string;
  barakId?: string;
  email: string;
  photoUrl?: string; // Tambah field untuk foto profil
  isDefaultAccount?: boolean;
  isMasterAdmin?: boolean;
}

export interface Barak {
  id: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
}

// Tambahkan tipe untuk pelanggaran dan pembinaan
export type ViolationType = 'Ringan' | 'Sedang' | 'Berat';

export type ViolationDetail = {
  Ringan: string[];
  Sedang: string[];
  Berat: string[];
};

export const violationDetails: ViolationDetail = {
  Ringan: [
    'Terlambat masuk kelas',
    'Tidak mengerjakan tugas',
    'Tidak berpakaian rapi',
    'Lainnya'
  ],
  Sedang: [
    'Meninggalkan kelas tanpa izin',
    'Berkelahi',
    'Merokok',
    'Lainnya'  
  ],
  Berat: [
    'Mencuri',
    'Membawa senjata tajam',
    'Narkoba',
    'Lainnya'
  ]
};

export interface Violation {
  id: string;
  studentId: string;
  violationType: ViolationType;
  violationDetail: string;
  description: string;
  recordedBy: string;
  recordedAt: string;
  isResolved?: boolean;
}

export type GuidanceStage = 'Tahap 1' | 'Tahap 2' | 'Tahap 3';

export type GuidanceDetail = {
  'Tahap 1': string[];
  'Tahap 2': string[];
  'Tahap 3': string[];
};

export const guidanceDetails: GuidanceDetail = {
  'Tahap 1': [
    'Peringatan Lisan',
    'Konseling Individual',
    'Lainnya'
  ],
  'Tahap 2': [
    'Peringatan Tertulis',
    'Konseling dengan Orang Tua',
    'Lainnya'
  ],
  'Tahap 3': [
    'Skorsing',
    'Pembinaan Khusus',
    'Lainnya'
  ]
};

export interface Guidance {
  id: string;
  violationId: string;
  studentId: string;
  guidanceStage: GuidanceStage;
  guidanceDetail: string;
  description: string;
  notes: string;
  conductedBy: string;
  conductedAt: string;
  resolveViolation?: boolean; // Tambah field ini
}

// Tambahkan interface baru
export interface RosterHistory {
  id: string;
  rosterId: string;
  teacherId: string;
  classId: string;
  dayOfWeek: DayOfWeek;
  hours: number[];
  effectiveFrom: string; // Timestamp kapan perubahan mulai berlaku
  createdAt: string;
  updatedAt?: string;
}
