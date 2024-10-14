import React, { createContext, useState, useContext } from 'react';
import { RosterEntry } from '../types';

interface RosterContextType {
  roster: RosterEntry[];
  addRosterEntry: (entry: Omit<RosterEntry, 'id'>) => void;
  updateRosterEntry: (id: string, entry: Omit<RosterEntry, 'id'>) => void;
  deleteRosterEntry: (id: string) => void;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

let nextRosterId = 1;

export const RosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const addRosterEntry = (entry: Omit<RosterEntry, 'id'>) => {
    setRoster([...roster, { ...entry, id: `roster_${nextRosterId++}`, hours: entry.hours || [] }]);
  };

  const updateRosterEntry = (id: string, updatedEntry: Omit<RosterEntry, 'id'>) => {
    setRoster(roster.map(entry => entry.id === id ? { ...updatedEntry, id, hours: updatedEntry.hours || [] } : entry));
  };

  const deleteRosterEntry = (id: string) => {
    setRoster(roster.filter(entry => entry.id !== id));
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