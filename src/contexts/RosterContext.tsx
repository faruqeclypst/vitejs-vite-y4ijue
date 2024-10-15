import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { RosterEntry } from '../types';

interface RosterContextType {
  roster: RosterEntry[];
  addRosterEntry: (entry: Omit<RosterEntry, 'id'>) => void;
  updateRosterEntry: (id: string, entry: Omit<RosterEntry, 'id'>) => void;
  deleteRosterEntry: (id: string) => void;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

export const RosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  useEffect(() => {
    const rosterRef = ref(db, 'roster');
    onValue(rosterRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rosterList = Object.entries(data).map(([id, entry]) => ({
          id,
          ...(entry as Omit<RosterEntry, 'id'>)
        }));
        setRoster(rosterList);
      } else {
        setRoster([]);
      }
    });
  }, []);

  const addRosterEntry = (entry: Omit<RosterEntry, 'id'>) => {
    const rosterRef = ref(db, 'roster');
    push(rosterRef, entry);
  };

  const updateRosterEntry = (id: string, updatedEntry: Omit<RosterEntry, 'id'>) => {
    const entryRef = ref(db, `roster/${id}`);
    update(entryRef, updatedEntry);
  };

  const deleteRosterEntry = (id: string) => {
    const entryRef = ref(db, `roster/${id}`);
    remove(entryRef);
  };

  return (
    <RosterContext.Provider value={{ roster, addRosterEntry, updateRosterEntry, deleteRosterEntry }}>
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