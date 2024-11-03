import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Teacher } from '../types';
import { useFirebaseData } from '../hooks/useFirebaseData';

interface TeachersContextType {
  teachers: Teacher[];
  allTeachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Omit<Teacher, 'id'>) => void;
  deleteTeacher: (id: string) => void;
  restoreTeacher: (id: string) => Promise<void>;
  deleteTeacherPermanently: (id: string) => Promise<void>;
}

const TeachersContext = createContext<TeachersContextType | undefined>(undefined);

export const TeachersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: teachersData } = useFirebaseData<Teacher[]>({
    path: 'teachers',
    transform: (data: Record<string, Teacher> | null) => {
      if (!data) return [];
      return Object.entries(data).map(([id, teacher]) => ({
        ...teacher,
        id
      }));
    }
  });

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    if (teachersData) {
      const activeTeachers = teachersData.filter(teacher => !teacher.isDeleted);
      setTeachers(activeTeachers);
      setAllTeachers(teachersData);
    }
  }, [teachersData]);

  const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const teachersRef = ref(db, 'teachers');
    // Tambahkan isDeleted: false saat membuat guru baru
    push(teachersRef, { ...teacher, isDeleted: false });
  };

  const updateTeacher = (id: string, updatedTeacher: Omit<Teacher, 'id'>) => {
    const teacherRef = ref(db, `teachers/${id}`);
    // Pastikan isDeleted tidak hilang saat update
    update(teacherRef, { ...updatedTeacher, isDeleted: false });
  };

  const deleteTeacher = async (id: string) => {
    const teacherRef = ref(db, `teachers/${id}`);
    await update(teacherRef, { isDeleted: true });
  };

  const restoreTeacher = async (id: string) => {
    const teacherRef = ref(db, `teachers/${id}`);
    await update(teacherRef, { isDeleted: false });
  };

  const deleteTeacherPermanently = async (id: string) => {
    const teacherRef = ref(db, `teachers/${id}`);
    await remove(teacherRef);
  };

  return (
    <TeachersContext.Provider value={{ 
      teachers, 
      allTeachers,
      addTeacher, 
      updateTeacher, 
      deleteTeacher,
      restoreTeacher,
      deleteTeacherPermanently
    }}>
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
