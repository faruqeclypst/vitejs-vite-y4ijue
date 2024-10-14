import React, { createContext, useState, useContext } from 'react';
import { Teacher } from '../types';

interface TeachersContextType {
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Omit<Teacher, 'id'>) => void;
  deleteTeacher: (id: string) => void;
}

const TeachersContext = createContext<TeachersContextType | undefined>(undefined);

let nextTeacherId = 1;

export const TeachersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    setTeachers([...teachers, { ...teacher, id: `teacher_${nextTeacherId++}` }]);
  };

  const updateTeacher = (id: string, updatedTeacher: Omit<Teacher, 'id'>) => {
    setTeachers(teachers.map(teacher => teacher.id === id ? { ...updatedTeacher, id } : teacher));
  };

  const deleteTeacher = (id: string) => {
    setTeachers(teachers.filter(teacher => teacher.id !== id));
  };

  return (
    <TeachersContext.Provider value={{ teachers, addTeacher, updateTeacher, deleteTeacher }}>
      {children}
    </TeachersContext.Provider>
  );
};

export const useTeachers = () => {
  const context = useContext(TeachersContext);
  if (context === undefined) {
    throw new Error('useTeachers must be used within a TeachersProvider');
  }
  return context;
};