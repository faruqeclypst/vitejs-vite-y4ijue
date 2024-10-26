import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
import { db } from '../firebase';
import { Barak } from '../types';

interface BarakContextType {
  baraks: Barak[];
  addBarak: (barak: Omit<Barak, 'id'>) => void;
  updateBarak: (id: string, barak: Omit<Barak, 'id'>) => void;
  deleteBarak: (id: string) => Promise<{ success: boolean; message: string }>;
  checkBarakHasStudents: (barakName: string) => Promise<boolean>;
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
    try {
      // Dapatkan data barak lama
      const oldBarak = baraks.find(b => b.id === id);
      if (!oldBarak) return;

      // Update barak
      const barakRef = ref(db, `baraks/${id}`);
      await update(barakRef, barak);

      // Update semua siswa yang terkait dengan barak ini
      const studentsRef = ref(db, 'students');
      const snapshot = await get(studentsRef);
      const studentsData = snapshot.val();

      if (studentsData) {
        const updates: { [key: string]: any } = {};
        
        Object.entries(studentsData).forEach(([studentId, student]: [string, any]) => {
          if (student.barak === oldBarak.name) {
            updates[`students/${studentId}`] = {
              ...student,
              barak: barak.name,
              gender: barak.gender
            };
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }
    } catch (error) {
      console.error('Error updating barak:', error);
      throw error;
    }
  };

  const checkBarakHasStudents = async (barakName: string): Promise<boolean> => {
    const studentsRef = ref(db, 'students');
    const snapshot = await get(studentsRef);
    const data = snapshot.val();
    
    if (!data) return false;
    
    return Object.values(data).some((student: any) => 
      student.barak === barakName && !student.isDeleted
    );
  };

  const deleteBarak = async (id: string): Promise<{ success: boolean; message: string }> => {
    const barak = baraks.find(b => b.id === id);
    if (!barak) {
      return { success: false, message: 'Barak tidak ditemukan' };
    }

    const hasStudents = await checkBarakHasStudents(barak.name);
    if (hasStudents) {
      return { 
        success: false, 
        message: 'Tidak dapat menghapus barak karena masih ada siswa yang terdaftar' 
      };
    }

    const barakRef = ref(db, `baraks/${id}`);
    await remove(barakRef);
    return { success: true, message: 'Barak berhasil dihapus' };
  };

  return (
    <BarakContext.Provider value={{ 
      baraks, 
      addBarak, 
      updateBarak, 
      deleteBarak,
      checkBarakHasStudents 
    }}>
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
