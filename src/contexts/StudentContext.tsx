import React, { createContext, useState, useContext } from 'react';
import { Student } from '../types';

interface StudentContextType {
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, student: Omit<Student, 'id'>) => void;
  deleteStudent: (id: string) => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

let nextStudentId = 1;

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);

  const addStudent = (student: Omit<Student, 'id'>) => {
    if (window.confirm('Are you sure you want to add this student?')) {
      setStudents([...students, { ...student, id: `student_${nextStudentId++}` }]);
      alert('Student added successfully.');
    }
  };

  const updateStudent = (id: string, updatedStudent: Omit<Student, 'id'>) => {
    if (window.confirm('Are you sure you want to update this student?')) {
      setStudents(students.map(student => student.id === id ? { ...updatedStudent, id } : student));
      alert('Student updated successfully.');
    }
  };

  const deleteStudent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      setStudents(students.filter(student => student.id !== id));
      alert('Student deleted successfully.');
    }
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