import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, get, remove } from 'firebase/database';
import { db } from '../firebase';
import { RosterEntry, RosterHistory } from '../types';

interface RosterContextType {
  roster: RosterEntry[];
  allRoster: RosterEntry[]; // Tambahkan allRoster ke interface
  addRosterEntry: (entry: Omit<RosterEntry, 'id' | 'createdAt'>) => void;
  updateRosterEntry: (id: string, entry: Omit<RosterEntry, 'id'>) => void;
  deleteRosterEntry: (id: string) => void;
  deleteRoster: (id: string) => Promise<void>;
  getEffectiveRoster: (rosterId: string, date: string) => RosterEntry | undefined;
  rosterHistory: RosterHistory[];
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

export const RosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [allRoster, setAllRoster] = useState<RosterEntry[]>([]);
  const [rosterHistory, setRosterHistory] = useState<RosterHistory[]>([]);

  useEffect(() => {
    const rosterRef = ref(db, 'roster');
    onValue(rosterRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rosterList = Object.entries(data).map(([id, entry]) => ({
          id,
          ...(entry as Omit<RosterEntry, 'id'>)
        }));
        // Untuk tampilan normal, filter yang tidak dihapus
        const activeRoster = rosterList.filter(entry => !entry.isDeleted);
        setRoster(activeRoster);
        
        // Simpan semua roster termasuk yang dihapus untuk keperluan attendance
        setAllRoster(rosterList);
      } else {
        setRoster([]);
        setAllRoster([]);
      }
    });
  }, []);

  useEffect(() => {
    const historyRef = ref(db, 'roster_history');
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

  const addRosterEntry = async (entry: Omit<RosterEntry, 'id' | 'createdAt'>) => {
    const rosterRef = ref(db, 'roster');
    const timestamp = new Date().toISOString();
    
    // Cek apakah sudah ada jadwal dengan guru, kelas, dan hari yang sama
    const existingEntry = roster.find(r => 
      r.teacherId === entry.teacherId && 
      r.classId === entry.classId && 
      r.dayOfWeek === entry.dayOfWeek
    );

    if (existingEntry) {
      // Jika ada, gabungkan jam yang baru dengan yang sudah ada
      const combinedHours = [...new Set([...existingEntry.hours, ...entry.hours])].sort((a, b) => a - b);
      
      // Update jadwal yang sudah ada
      const updateData = {
        hours: combinedHours,
        updatedAt: timestamp
      };

      // Update roster
      const entryRef = ref(db, `roster/${existingEntry.id}`);
      await update(entryRef, updateData);

      // Tambah history
      const historyRef = ref(db, 'roster_history');
      await push(historyRef, {
        rosterId: existingEntry.id,
        teacherId: existingEntry.teacherId,
        classId: existingEntry.classId,
        dayOfWeek: existingEntry.dayOfWeek,
        hours: combinedHours,
        effectiveFrom: timestamp,
        createdAt: existingEntry.createdAt,
        updatedAt: timestamp
      });
    } else {
      // Jika belum ada, buat jadwal baru
      const newEntry = {
        ...entry,
        createdAt: timestamp
      };
      
      const newRosterRef = await push(rosterRef, newEntry);
      
      // Tambahkan ke history
      const historyRef = ref(db, 'roster_history');
      await push(historyRef, {
        rosterId: newRosterRef.key,
        ...newEntry,
        effectiveFrom: timestamp
      });
    }
  };

  const updateRosterEntry = async (id: string, entry: Omit<RosterEntry, 'id'>) => {
    try {
      const timestamp = new Date().toISOString();
      const rosterRef = ref(db, `roster/${id}`);
      
      // Dapatkan data roster yang ada
      const snapshot = await get(rosterRef);
      const existingRoster = snapshot.val();
      
      // Persiapkan data update dengan mempertahankan createdAt yang ada
      const updateData = {
        teacherId: entry.teacherId,
        classId: entry.classId,
        dayOfWeek: entry.dayOfWeek,
        hours: entry.hours,
        createdAt: existingRoster?.createdAt || entry.createdAt, // Gunakan createdAt yang ada atau yang baru
        updatedAt: timestamp
      };

      // Update roster
      await update(rosterRef, updateData);

      // Tambah history baru
      const historyRef = ref(db, 'roster_history');
      await push(historyRef, {
        rosterId: id,
        ...updateData,
        effectiveFrom: timestamp
      });

    } catch (error) {
      console.error('Error updating roster:', error);
      throw error;
    }
  };

  const deleteRosterEntry = async (id: string) => {
    try {
      // 1. Cek apakah ada attendance yang menggunakan roster ini
      const attendanceRef = ref(db, 'attendance');
      const snapshot = await get(attendanceRef);
      const attendanceData = snapshot.val();
      
      const hasAttendance = Object.values(attendanceData || {}).some(
        (record: any) => record.rosterId === id
      );

      if (hasAttendance) {
        // 2. Jika ada, archive roster daripada menghapus
        await update(ref(db, `roster/${id}`), {
          isArchived: true,
          archivedAt: new Date().toISOString()
        });
      } else {
        // 3. Jika tidak ada, aman untuk dihapus
        await remove(ref(db, `roster/${id}`));
      }
    } catch (error) {
      console.error('Error deleting roster:', error);
      throw error;
    }
  };

  const deleteRoster = async (id: string) => {
    try {
      const rosterRef = ref(db, `roster/${id}`);
      await remove(rosterRef);
    } catch (error) {
      console.error('Error deleting roster:', error);
      throw error;
    }
  };

  // Tambahkan fungsi untuk mendapatkan roster yang efektif pada tanggal tertentu
  const getEffectiveRoster = (rosterId: string, date: string): RosterEntry | undefined => {
    const targetDate = new Date(date);
    
    // Dapatkan semua history untuk roster ini
    const rosterHistories = rosterHistory
      .filter(h => h.rosterId === rosterId)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    // Cari history yang efektif pada tanggal yang diminta
    for (const history of rosterHistories) {
      if (new Date(history.effectiveFrom) <= targetDate) {
        return {
          id: rosterId,
          teacherId: history.teacherId,
          classId: history.classId,
          dayOfWeek: history.dayOfWeek,
          hours: history.hours,
          createdAt: history.createdAt,
          updatedAt: history.updatedAt
        };
      }
    }

    // Jika tidak ada history yang sesuai, kembalikan roster terkini
    return roster.find(r => r.id === rosterId);
  };

  return (
    <RosterContext.Provider value={{ 
      roster, 
      allRoster, // Expose allRoster
      addRosterEntry, 
      updateRosterEntry, 
      deleteRosterEntry,
      deleteRoster,
      getEffectiveRoster, // Expose fungsi baru
      rosterHistory // Expose history
    }}>
      {children}
    </RosterContext.Provider>
  );
};

export const useRoster = () => {
  const context = useContext(RosterContext);
  if (context === undefined) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
};
