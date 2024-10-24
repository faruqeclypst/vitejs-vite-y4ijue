import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, get, remove } from 'firebase/database';
import { db } from '../firebase';
import { Attendance } from '../types';

interface AttendanceContextType {
  attendanceRecords: Attendance[];
  addOrUpdateAttendanceRecord: (record: Omit<Attendance, 'id'>) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);

  useEffect(() => {
    const attendanceRef = ref(db, 'attendance');
    onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const recordsList = Object.entries(data).map(([id, record]) => ({
          id,
          ...(record as Omit<Attendance, 'id'>)
        }));
        setAttendanceRecords(recordsList);
      } else {
        setAttendanceRecords([]);
      }
    });
  }, []);

  const addOrUpdateAttendanceRecord = async (record: Omit<Attendance, 'id'>) => {
    const attendanceRef = ref(db, 'attendance');
    
    // Check if a record already exists for this roster entry and date
    const snapshot = await get(attendanceRef);
    const existingRecords = snapshot.val();
    
    if (existingRecords) {
      const existingRecordId = Object.entries(existingRecords).find(([_, value]) => 
        (value as Attendance).rosterId === record.rosterId && 
        (value as Attendance).date === record.date
      )?.[0];

      if (existingRecordId) {
        // Update existing record
        const recordRef = ref(db, `attendance/${existingRecordId}`);
        await update(recordRef, record);
      } else {
        // Create new record
        await push(attendanceRef, record);
      }
    } else {
      // Create new record if no records exist yet
      await push(attendanceRef, record);
    }
  };

  const deleteAttendanceRecord = async (id: string) => {
    try {
      const attendanceRef = ref(db, `attendance/${id}`);
      await remove(attendanceRef);
      // Update state setelah menghapus
      setAttendanceRecords(prev => prev.filter(record => record.id !== id));
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  };

  return (
    <AttendanceContext.Provider value={{ 
      attendanceRecords, 
      addOrUpdateAttendanceRecord,
      deleteAttendanceRecord
    }}>
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
