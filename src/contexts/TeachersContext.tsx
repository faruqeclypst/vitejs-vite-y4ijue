import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update } from 'firebase/database';
import { db } from '../firebase';
import { Teacher } from '../types';

interface TeachersContextType {
  teachers: Teacher[];
  allTeachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Omit<Teacher, 'id'>) => void;
  deleteTeacher: (id: string) => void;
}

const TeachersContext = createContext<TeachersContextType | undefined>(undefined);

export const TeachersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const teachersRef = ref(db, 'teachers');
    onValue(teachersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teachersList = Object.entries(data).map(([id, teacher]) => ({
          id,
          ...(teacher as Omit<Teacher, 'id'>)
        }));
        // Untuk tampilan normal, filter yang tidak dihapus
        const activeTeachers = teachersList.filter(teacher => !teacher.isDeleted);
        setTeachers(activeTeachers);
        
        // Simpan semua guru termasuk yang dihapus untuk keperluan attendance
        setAllTeachers(teachersList);
      } else {
        setTeachers([]);
        setAllTeachers([]);
      }
    });
  }, []);

  const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const teachersRef = ref(db, 'teachers');
    push(teachersRef, teacher);
  };

  const updateTeacher = (id: string, updatedTeacher: Omit<Teacher, 'id'>) => {
    const teacherRef = ref(db, `teachers/${id}`);
    update(teacherRef, updatedTeacher).then(() => {
      setTeachers(prevTeachers => 
        prevTeachers.map(teacher => 
          teacher.id === id ? { ...teacher, ...updatedTeacher } : teacher
        )
      );
    });
  };

  const deleteTeacher = async (id: string) => {
    const teacherRef = ref(db, `teachers/${id}`);
    // Soft delete dengan mengupdate flag isDeleted
    await update(teacherRef, { isDeleted: true });
  };

  return (
    <TeachersContext.Provider value={{ 
      teachers, 
      allTeachers, // Expose allTeachers
      addTeacher, 
      updateTeacher, 
      deleteTeacher 
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
