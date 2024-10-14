import React, { createContext, useState, useContext } from 'react';
import { Attendance, AttendanceStatus } from '../types';

interface AttendanceContextType {
  attendanceRecords: Attendance[];
  addOrUpdateAttendanceRecord: (record: Omit<Attendance, 'id'>) => void;
  deleteAttendanceRecord: (id: string) => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

let nextId = 1;

const initialAttendanceRecords: Attendance[] = [
  {
    id: `attendance_${nextId++}`,
    rosterId: 'roster_1',
    date: '2023-05-01',
    presentHours: [1, 2, 3],
    status: 'Present',
    remarks: 'On time'
  },
  {
    id: `attendance_${nextId++}`,
    rosterId: 'roster_2',
    date: '2023-05-01',
    presentHours: [1, 2],
    status: 'Late',
    remarks: 'Arrived 10 minutes late'
  },
];

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>(initialAttendanceRecords);

  const addOrUpdateAttendanceRecord = (record: Omit<Attendance, 'id'>) => {
    setAttendanceRecords(prevRecords => {
      const existingRecordIndex = prevRecords.findIndex(
        r => r.rosterId === record.rosterId && r.date === record.date
      );

      if (existingRecordIndex !== -1) {
        const updatedRecords = [...prevRecords];
        updatedRecords[existingRecordIndex] = { ...record, id: prevRecords[existingRecordIndex].id };
        return updatedRecords;
      } else {
        const newId = `attendance_${nextId++}`;
        return [...prevRecords, { ...record, id: newId }];
      }
    });
  };

  const deleteAttendanceRecord = (id: string) => {
    setAttendanceRecords(prevRecords => prevRecords.filter(record => record.id !== id));
  };

  return (
    <AttendanceContext.Provider value={{ attendanceRecords, addOrUpdateAttendanceRecord, deleteAttendanceRecord }}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};