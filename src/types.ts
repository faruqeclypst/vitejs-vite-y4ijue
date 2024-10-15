export interface Teacher {
  id: string;
  name: string;
  code: string;
}

export interface RosterEntry {
  id: string;
  teacherId: string;
  classId: string;
  dayOfWeek: DayOfWeek;
  hours: number[];
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
  gender: 'Male' | 'Female';
  class: string;
  asrama: string;
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