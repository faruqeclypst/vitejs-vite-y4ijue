import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, set, remove, get, update } from 'firebase/database';
import { db } from '../firebase';

interface Asrama {
  id: string;
  name: string;
}

interface AsramaContextType {
  asramas: Asrama[];
  addAsrama: (name: string) => void;
  updateAsrama: (id: string, name: string, oldName: string) => Promise<void>;
  deleteAsrama: (id: string) => void;
}

const AsramaContext = createContext<AsramaContextType | undefined>(undefined);

export const AsramaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [asramas, setAsramas] = useState<Asrama[]>([]);

  useEffect(() => {
    const asramaRef = ref(db, 'asramas');
    onValue(asramaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const asramaList = Object.entries(data).map(([id, value]) => ({
          id,
          name: typeof value === 'string' ? value : (value as { name: string }).name
        }));
        setAsramas(asramaList);
      } else {
        setAsramas([]);
      }
    });
  }, []);

  const addAsrama = (name: string) => {
    const asramaRef = ref(db, 'asramas');
    push(asramaRef, { name });
  };

  const updateAsrama = async (id: string, newName: string, oldName: string) => {
    // Update nama asrama
    const asramaRef = ref(db, `asramas/${id}`);
    await set(asramaRef, { name: newName });

    // Update semua siswa yang menggunakan asrama ini
    const studentsRef = ref(db, 'students');
    const snapshot = await get(studentsRef);
    const students = snapshot.val();

    if (students) {
      const updates: { [key: string]: any } = {};
      
      Object.entries(students).forEach(([studentId, student]: [string, any]) => {
        if (student.asrama === oldName) {
          updates[`students/${studentId}/asrama`] = newName;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }
  };

  const deleteAsrama = (id: string) => {
    const asramaRef = ref(db, `asramas/${id}`);
    remove(asramaRef);
  };

  return (
    <AsramaContext.Provider value={{ asramas, addAsrama, updateAsrama, deleteAsrama }}>
      {children}
    </AsramaContext.Provider>
  );
};

export const useAsrama = () => {
  const context = useContext(AsramaContext);
  if (context === undefined) {
    throw new Error('useAsrama must be used within an AsramaProvider');
  }
  return context;
};
