import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, get } from 'firebase/database';
import { db } from '../firebase';
import { RosterEntry } from '../types';

interface RosterContextType {
  roster: RosterEntry[];
  allRoster: RosterEntry[]; // Tambahkan allRoster ke interface
  addRosterEntry: (entry: Omit<RosterEntry, 'id'>) => void;
  updateRosterEntry: (id: string, entry: Omit<RosterEntry, 'id'>) => void;
  deleteRosterEntry: (id: string) => void;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

export const RosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [allRoster, setAllRoster] = useState<RosterEntry[]>([]);

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

  const addRosterEntry = async (entry: Omit<RosterEntry, 'id'>) => {
    const rosterRef = ref(db, 'roster');
    
    // Cek apakah sudah ada jadwal yang sama (termasuk yang dihapus)
    const snapshot = await get(rosterRef);
    const existingEntries = snapshot.val();
    
    if (existingEntries) {
      const isDuplicate = Object.values(existingEntries).some((existing: any) => 
        existing.teacherId === entry.teacherId &&
        existing.classId === entry.classId &&
        existing.dayOfWeek === entry.dayOfWeek &&
        JSON.stringify(existing.hours.sort()) === JSON.stringify(entry.hours.sort())
      );

      if (isDuplicate) {
        // Jika ada jadwal yang sama, cari yang dihapus dan aktifkan kembali
        const existingEntry = Object.entries(existingEntries).find(([_, value]: [string, any]) => 
          value.teacherId === entry.teacherId &&
          value.classId === entry.classId &&
          value.dayOfWeek === entry.dayOfWeek &&
          JSON.stringify(value.hours.sort()) === JSON.stringify(entry.hours.sort())
        );

        if (existingEntry) {
          const [id, value] = existingEntry;
          // Aktifkan kembali jadwal yang dihapus
          await update(ref(db, `roster/${id}`), {
            ...value as object,
            isDeleted: false
          });
          return;
        }
      }
    }

    // Jika tidak ada duplikasi, tambah jadwal baru
    push(rosterRef, entry);
  };

  const updateRosterEntry = (id: string, updatedEntry: Omit<RosterEntry, 'id'>) => {
    const entryRef = ref(db, `roster/${id}`);
    update(entryRef, updatedEntry);
  };

  const deleteRosterEntry = async (id: string) => {
    const rosterRef = ref(db, `roster/${id}`);
    // Soft delete dengan mengupdate flag isDeleted
    await update(rosterRef, { isDeleted: true });
  };

  return (
    <RosterContext.Provider value={{ 
      roster, 
      allRoster, // Expose allRoster
      addRosterEntry, 
      updateRosterEntry, 
      deleteRosterEntry 
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
