import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update } from 'firebase/database';
import { db } from '../firebase';
import { Student } from '../types';

interface StudentContextType {
  students: Student[];
  allStudents: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, student: Omit<Student, 'id'>) => void;
  deleteStudent: (id: string) => void;
  restoreStudent: (id: string) => void; // Tambah ini
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const studentsList = Object.entries(data).map(([id, student]) => ({
          id,
          ...(student as Omit<Student, 'id'>)
        }));
        // Filter untuk tampilan aktif
        const activeStudents = studentsList.filter(student => !student.isDeleted);
        setStudents(activeStudents);
        
        // Simpan semua siswa termasuk yang dihapus
        setAllStudents(studentsList);
      } else {
        setStudents([]);
        setAllStudents([]);
      }
    });
  }, []);

  const addStudent = (student: Omit<Student, 'id'>) => {
    const studentsRef = ref(db, 'students');
    push(studentsRef, student);
  };

  const updateStudent = (id: string, updatedStudent: Omit<Student, 'id'>) => {
    const studentRef = ref(db, `students/${id}`);
    update(studentRef, updatedStudent);
  };

  // Update deleteStudent untuk soft delete
  const deleteStudent = async (id: string) => {
    const studentRef = ref(db, `students/${id}`);
    await update(studentRef, { isDeleted: true });
  };

  // Tambah fungsi restore
  const restoreStudent = async (id: string) => {
    const studentRef = ref(db, `students/${id}`);
    await update(studentRef, { isDeleted: false });
  };

  return (
    <StudentContext.Provider value={{ 
      students, 
      allStudents,
      addStudent, 
      updateStudent, 
      deleteStudent,
      restoreStudent // Tambah ini
    }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudents must be used within a StudentProvider');
  }
  return context;
};
