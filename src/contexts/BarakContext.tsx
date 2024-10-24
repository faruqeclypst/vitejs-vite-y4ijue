import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Barak } from '../types';

interface BarakContextType {
  baraks: Barak[];
  addBarak: (barak: Omit<Barak, 'id'>) => void;
  updateBarak: (id: string, barak: Omit<Barak, 'id'>) => void;
  deleteBarak: (id: string) => void;
}

const BarakContext = createContext<BarakContextType | undefined>(undefined);

export const BarakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [baraks, setBaraks] = useState<Barak[]>([]);

  useEffect(() => {
    const baraksRef = ref(db, 'baraks');
    onValue(baraksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const baraksList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Barak, 'id'>)
        }));
        setBaraks(baraksList);
      } else {
        setBaraks([]);
      }
    });
  }, []);

  const addBarak = async (barak: Omit<Barak, 'id'>) => {
    const baraksRef = ref(db, 'baraks');
    await push(baraksRef, barak);
  };

  const updateBarak = async (id: string, barak: Omit<Barak, 'id'>) => {
    const barakRef = ref(db, `baraks/${id}`);
    await update(barakRef, barak);
  };

  const deleteBarak = async (id: string) => {
    const barakRef = ref(db, `baraks/${id}`);
    await remove(barakRef);
  };

  return (
    <BarakContext.Provider value={{ baraks, addBarak, updateBarak, deleteBarak }}>
      {children}
    </BarakContext.Provider>
  );
};

export const useBarak = () => {
  const context = useContext(BarakContext);
  if (context === undefined) {
    throw new Error('useBarak must be used within a BarakProvider');
  }
  return context;
};
