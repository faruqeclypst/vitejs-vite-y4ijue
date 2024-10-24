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
  asrama: string;
  barak: string;
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

export type UserRole = 'admin' | 'admin_barak' | 'admin_asrama' | 'pengasuh' | 'piket' | 'wakil_kepala';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  asramaId?: string;
  barakId?: string;
  email: string;
  isDefaultAccount?: boolean;
}

export interface Barak {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
}

// Untuk backward compatibility
export interface Asrama extends Barak {}
