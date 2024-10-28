import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
import { db } from '../firebase';
import { Violation } from '../types';
import { useStudents } from './StudentContext';

interface ViolationContextType {
  violations: Violation[];
  addViolation: (violation: Omit<Violation, 'id'>) => Promise<void>;
  updateViolation: (id: string, violation: Omit<Violation, 'id'>) => Promise<void>;
  deleteViolation: (id: string) => Promise<void>;
  getStudentViolations: (studentId: string) => Violation[];
  getActiveViolations: () => Violation[];
  markViolationAsResolved: (id: string) => Promise<void>;
}

const ViolationContext = createContext<ViolationContextType | undefined>(undefined);

export const ViolationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const { allStudents } = useStudents();

  useEffect(() => {
    const violationsRef = ref(db, 'violations');
    
    // Hanya listen untuk perubahan violations
    const unsubscribeViolations = onValue(violationsRef, (snapshot) => {
      const violationsData = snapshot.val();
      
      if (violationsData) {
        const violationsList = Object.entries(violationsData).map(([id, value]) => ({
          id,
          ...(value as Omit<Violation, 'id'>)
        }));
        setViolations(violationsList);
      } else {
        setViolations([]);
      }
    });

    return () => {
      unsubscribeViolations();
    };
  }, []);

  const addViolation = async (violation: Omit<Violation, 'id'>) => {
    const violationsRef = ref(db, 'violations');
    await push(violationsRef, {
      ...violation,
      isResolved: false // Selalu set false saat menambah pelanggaran baru
    });
  };

  const updateViolation = async (id: string, violation: Omit<Violation, 'id'>) => {
    const violationRef = ref(db, `violations/${id}`);
    await update(violationRef, violation);
  };

  const deleteViolation = async (id: string) => {
    try {
      // 1. Hapus semua guidance terkait terlebih dahulu
      const guidancesRef = ref(db, 'guidances');
      const guidanceSnapshot = await get(guidancesRef);
      const guidancesData = guidanceSnapshot.val();

      if (guidancesData) {
        const deletePromises = Object.entries(guidancesData)
          .filter(([_, guidance]: [string, any]) => guidance.violationId === id)
          .map(([guidanceId]) => remove(ref(db, `guidances/${guidanceId}`)));
        
        await Promise.all(deletePromises);
      }

      // 2. Kemudian hapus violation
      const violationRef = ref(db, `violations/${id}`);
      await remove(violationRef);
    } catch (error) {
      console.error('Error deleting violation:', error);
      throw error;
    }
  };

  const getStudentViolations = (studentId: string) => {
    return violations.filter(violation => violation.studentId === studentId);
  };

  const getActiveViolations = () => {
    return violations.filter(violation => {
      const student = allStudents.find(s => s.id === violation.studentId);
      // Tampilkan jika siswa aktif dan pelanggaran belum selesai
      return student && !student.isDeleted && !violation.isResolved;
    });
  };

  const markViolationAsResolved = async (id: string) => {
    const violationRef = ref(db, `violations/${id}`);
    await update(violationRef, { 
      isResolved: true,
      resolvedAt: new Date().toISOString()
    });
  };

  return (
    <ViolationContext.Provider value={{ 
      violations, 
      addViolation, 
      updateViolation, 
      deleteViolation,
      getStudentViolations,
      getActiveViolations,
      markViolationAsResolved
    }}>
      {children}
    </ViolationContext.Provider>
  );
};

export const useViolation = () => {
  const context = useContext(ViolationContext);
  if (context === undefined) {
    throw new Error('useViolation must be used within a ViolationProvider');
  }
  return context;
};
