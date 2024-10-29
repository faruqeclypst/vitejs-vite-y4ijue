import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Attendance, RosterHistory } from '../types';
import { useRoster } from './RosterContext';

interface AttendanceContextType {
  attendanceRecords: Attendance[];
  addOrUpdateAttendanceRecord: (data: {
    rosterId: string;
    date: string;
    presentHours: number[];
    keterangan: string;
  }) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
  getAttendanceRecords: (startDate: string, endDate: string) => Promise<Attendance[]>;
  getEffectiveHours: (rosterId: string, date: string) => number[];
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const { roster } = useRoster();
  const [rosterHistory, setRosterHistory] = useState<RosterHistory[]>([]);

  useEffect(() => {
    const attendanceRef = ref(db, 'attendance');
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const recordsList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Attendance, 'id'>)
        }));
        setAttendanceRecords(recordsList);
      } else {
        setAttendanceRecords([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const historyRef = ref(db, 'rosterHistory');
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<RosterHistory, 'id'>)
        }));
        setRosterHistory(historyList);
      }
    });

    return () => unsubscribe();
  }, []);

  const addOrUpdateAttendanceRecord = async (data: {
    rosterId: string;
    date: string;
    presentHours: number[];
    keterangan: string;
  }) => {
    try {
      const existingRecord = attendanceRecords.find(
        record => record.rosterId === data.rosterId && record.date === data.date
      );

      if (existingRecord) {
        const recordRef = ref(db, `attendance/${existingRecord.id}`);
        await update(recordRef, {
          presentHours: data.presentHours,
          keterangan: data.keterangan,
          updatedAt: new Date().toISOString()
        });
      } else {
        const attendanceRef = ref(db, 'attendance');
        await push(attendanceRef, {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error adding/updating attendance:', error);
      throw error;
    }
  };

  const deleteAttendanceRecord = async (id: string) => {
    try {
      const attendanceRef = ref(db, `attendance/${id}`);
      await remove(attendanceRef);
      setAttendanceRecords(prev => prev.filter(record => record.id !== id));
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  };

  const getEffectiveHours = (rosterId: string, date: string) => {
    const targetDate = new Date(date);
    const relevantHistory = rosterHistory
      .filter(h => h.rosterId === rosterId)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    for (const history of relevantHistory) {
      if (new Date(history.effectiveFrom) <= targetDate) {
        return history.hours;
      }
    }

    const rosterEntry = roster.find(r => r.id === rosterId);
    return rosterEntry?.hours || [];
  };

  const getAttendanceRecords = async (startDate: string, endDate: string) => {
    try {
      const records = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
      });

      return records.map(record => {
        const rosterEntry = roster.find(r => r.id === record.rosterId);
        if (!rosterEntry) return null;

        const effectiveHours = getEffectiveHours(record.rosterId, record.date);

        return {
          ...record,
          rosterData: {
            ...rosterEntry,
            hours: effectiveHours
          }
        };
      }).filter(Boolean) as Attendance[];
    } catch (error) {
      console.error('Error getting attendance records:', error);
      throw error;
    }
  };

  return (
    <AttendanceContext.Provider value={{
      attendanceRecords,
      addOrUpdateAttendanceRecord,
      deleteAttendanceRecord,
      getAttendanceRecords,
      getEffectiveHours
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
