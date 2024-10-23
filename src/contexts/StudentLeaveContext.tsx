import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { db } from '../firebase';
import { StudentLeave } from '../types';

interface StudentLeaveContextType {
  leaves: StudentLeave[];
  addLeave: (leave: Omit<StudentLeave, 'id'>) => Promise<void>;
  updateLeave: (id: string, leave: Omit<StudentLeave, 'id'>) => Promise<void>;
  deleteLeave: (id: string) => Promise<void>;
  getStudentLeaves: (studentId: string) => StudentLeave[];
}

const StudentLeaveContext = createContext<StudentLeaveContextType | undefined>(undefined);

export const StudentLeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leaves, setLeaves] = useState<StudentLeave[]>([]);

  useEffect(() => {
    const leavesRef = ref(db, 'studentLeaves');
    onValue(leavesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const leavesList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<StudentLeave, 'id'>)
        }));
        setLeaves(leavesList);
      } else {
        setLeaves([]);
      }
    });
  }, []);

  const addLeave = async (leave: Omit<StudentLeave, 'id'>) => {
    const leavesRef = ref(db, 'studentLeaves');
    await push(leavesRef, leave);
  };

  const updateLeave = async (id: string, leave: Omit<StudentLeave, 'id'>) => {
    const leaveRef = ref(db, `studentLeaves/${id}`);
    await set(leaveRef, leave);
  };

  const deleteLeave = async (id: string) => {
    const leaveRef = ref(db, `studentLeaves/${id}`);
    await remove(leaveRef);
  };

  const getStudentLeaves = (studentId: string) => {
    return leaves.filter(leave => leave.studentId === studentId);
  };

  return (
    <StudentLeaveContext.Provider value={{ leaves, addLeave, updateLeave, deleteLeave, getStudentLeaves }}>
      {children}
    </StudentLeaveContext.Provider>
  );
};

export const useStudentLeave = () => {
  const context = useContext(StudentLeaveContext);
  if (context === undefined) {
    throw new Error('useStudentLeave must be used within a StudentLeaveProvider');
  }
  return context;
};
