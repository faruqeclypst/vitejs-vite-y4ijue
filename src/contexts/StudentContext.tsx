import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Student } from '../types';

interface StudentContextType {
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, student: Omit<Student, 'id'>) => void;
  deleteStudent: (id: string) => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const studentsList = Object.entries(data).map(([id, student]) => ({
          id,
          ...(student as Omit<Student, 'id'>)
        }));
        setStudents(studentsList);
      } else {
        setStudents([]);
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

  const deleteStudent = (id: string) => {
    const studentRef = ref(db, `students/${id}`);
    remove(studentRef);
  };

  return (
    <StudentContext.Provider value={{ students, addStudent, updateStudent, deleteStudent }}>
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