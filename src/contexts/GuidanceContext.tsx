import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Guidance } from '../types';
import { useStudents } from './StudentContext';

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
  const { allStudents } = useStudents();

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
    await push(guidancesRef, guidance);
  };

  const updateGuidance = async (id: string, guidance: Omit<Guidance, 'id'>) => {
    const guidanceRef = ref(db, `guidances/${id}`);
    await update(guidanceRef, guidance);
  };

  const deleteGuidance = async (id: string) => {
    const guidanceRef = ref(db, `guidances/${id}`);
    await remove(guidanceRef);
  };

  const getStudentGuidances = (studentId: string) => {
    return guidances.filter(guidance => {
      const student = allStudents.find(s => s.id === studentId);
      return student && !student.isDeleted && guidance.studentId === studentId;
    });
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
