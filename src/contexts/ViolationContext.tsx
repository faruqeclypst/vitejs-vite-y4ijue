import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
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
}

const ViolationContext = createContext<ViolationContextType | undefined>(undefined);

export const ViolationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const { allStudents } = useStudents();

  useEffect(() => {
    const violationsRef = ref(db, 'violations');
    onValue(violationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const violationsList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Violation, 'id'>)
        }));
        setViolations(violationsList);
      } else {
        setViolations([]);
      }
    });
  }, []);

  const addViolation = async (violation: Omit<Violation, 'id'>) => {
    const violationsRef = ref(db, 'violations');
    await push(violationsRef, violation);
  };

  const updateViolation = async (id: string, violation: Omit<Violation, 'id'>) => {
    const violationRef = ref(db, `violations/${id}`);
    await update(violationRef, violation);
  };

  const deleteViolation = async (id: string) => {
    const violationRef = ref(db, `violations/${id}`);
    await remove(violationRef);
  };

  const getStudentViolations = (studentId: string) => {
    return violations.filter(violation => violation.studentId === studentId);
  };

  const getActiveViolations = () => {
    return violations.filter(violation => {
      const student = allStudents.find(s => s.id === violation.studentId);
      return student && !student.isDeleted;
    });
  };

  return (
    <ViolationContext.Provider value={{ 
      violations, 
      addViolation, 
      updateViolation, 
      deleteViolation,
      getStudentViolations,
      getActiveViolations
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
