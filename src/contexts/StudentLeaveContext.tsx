import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { db } from '../firebase';
import { StudentLeave } from '../types';
import { useStudents } from './StudentContext';

interface StudentLeaveContextType {
  leaves: StudentLeave[];
  addLeave: (leave: Omit<StudentLeave, 'id'>) => Promise<void>;
  updateLeave: (id: string, leave: Omit<StudentLeave, 'id'>) => Promise<void>;
  deleteLeave: (id: string) => Promise<void>;
  getStudentLeaves: (studentId: string) => StudentLeave[];
  getActiveStudentLeaves: (studentId: string) => StudentLeave[]; // Tambah ini
}

const StudentLeaveContext = createContext<StudentLeaveContextType | undefined>(undefined);

export const StudentLeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leaves, setLeaves] = useState<StudentLeave[]>([]);
  const { allStudents } = useStudents(); // Gunakan allStudents untuk mengecek status siswa

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

  // Mendapatkan semua perizinan siswa (termasuk yang sudah dihapus)
  const getStudentLeaves = useCallback((studentId: string) => {
    return leaves.filter(leave => leave.studentId === studentId);
  }, [leaves]);

  // Mendapatkan perizinan hanya untuk siswa yang aktif
  const getActiveStudentLeaves = useCallback((studentId: string) => {
    const student = allStudents.find(s => s.id === studentId);
    // Jika siswa dihapus (isDeleted = true), return array kosong
    if (student?.isDeleted) {
      return [];
    }
    return leaves.filter(leave => leave.studentId === studentId);
  }, [leaves, allStudents]);

  return (
    <StudentLeaveContext.Provider value={{ 
      leaves, 
      addLeave, 
      updateLeave, 
      deleteLeave, 
      getStudentLeaves,
      getActiveStudentLeaves 
    }}>
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
