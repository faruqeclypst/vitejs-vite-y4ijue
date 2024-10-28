import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Guidance } from '../types';
import { useViolation } from './ViolationContext';

interface GuidanceContextType {
  guidances: Guidance[];
  addGuidance: (guidance: Omit<Guidance, 'id'>) => Promise<void>;
  updateGuidance: (id: string, guidance: Omit<Guidance, 'id'>) => Promise<void>;
  deleteGuidance: (id: string) => Promise<void>;
  getStudentGuidances: (studentId: string) => Guidance[];
  getViolationGuidances: (violationId: string) => Guidance[];
}

const GuidanceContext = createContext<GuidanceContextType | undefined>(undefined);

export const GuidanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guidances, setGuidances] = useState<Guidance[]>([]);
  useViolation();

  useEffect(() => {
    const guidancesRef = ref(db, 'guidances');
    onValue(guidancesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const guidancesList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Guidance, 'id'>)
        }));
        setGuidances(guidancesList);
      } else {
        setGuidances([]);
      }
    });
  }, []);

  const addGuidance = async (guidance: Omit<Guidance, 'id'>) => {
    const guidancesRef = ref(db, 'guidances');
    await push(guidancesRef, {
      ...guidance,
      conductedAt: new Date().toISOString()
    });

    // Hanya update isResolved jika resolveViolation true
    if (guidance.resolveViolation) {
      const violationRef = ref(db, `violations/${guidance.violationId}`);
      await update(violationRef, { 
        isResolved: true,
        resolvedAt: new Date().toISOString()
      });
    }
  };

  const updateGuidance = async (id: string, guidance: Omit<Guidance, 'id'>) => {
    const guidanceRef = ref(db, `guidances/${id}`);
    await update(guidanceRef, guidance);
  };

  const deleteGuidance = async (id: string) => {
    try {
      // Dapatkan data guidance yang akan dihapus
      const guidance = guidances.find(g => g.id === id);
      if (!guidance) return;

      // Hapus guidance dari database
      const guidanceRef = ref(db, `guidances/${id}`);
      await remove(guidanceRef);

      // Cek apakah masih ada guidance lain untuk violation yang sama
      const otherGuidances = guidances.filter(g => 
        g.violationId === guidance.violationId && g.id !== id
      );

      // Jika tidak ada guidance lain, reset status violation menjadi belum dibina
      if (otherGuidances.length === 0) {
        const violationRef = ref(db, `violations/${guidance.violationId}`);
        await update(violationRef, { isResolved: false });
      }
    } catch (error) {
      console.error('Error deleting guidance:', error);
      throw error;
    }
  };

  const getStudentGuidances = (studentId: string) => {
    return guidances.filter(guidance => guidance.studentId === studentId);
  };

  const getViolationGuidances = (violationId: string) => {
    return guidances.filter(guidance => guidance.violationId === violationId);
  };

  return (
    <GuidanceContext.Provider value={{ 
      guidances, 
      addGuidance, 
      updateGuidance, 
      deleteGuidance,
      getStudentGuidances,
      getViolationGuidances
    }}>
      {children}
    </GuidanceContext.Provider>
  );
};

export const useGuidance = () => {
  const context = useContext(GuidanceContext);
  if (context === undefined) {
    throw new Error('useGuidance must be used within a GuidanceProvider');
  }
  return context;
};
