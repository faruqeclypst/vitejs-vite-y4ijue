import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
import { db } from '../firebase';
import { Teacher } from '../types';

interface TeachersContextType {
  teachers: Teacher[];
  allTeachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Omit<Teacher, 'id'>) => void;
  deleteTeacher: (id: string) => void;
  restoreTeacher: (id: string) => void;
  deleteTeacherPermanently: (id: string) => void;
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
    try {
      // 1. Hapus semua roster entries untuk guru tersebut
      const rosterRef = ref(db, 'roster');
      const rosterSnapshot = await get(rosterRef);
      const rosterData = rosterSnapshot.val();
      
      if (rosterData) {
        const rosterPromises = Object.entries(rosterData)
          .filter(([_, entry]: [string, any]) => entry.teacherId === id)
          .map(([rosterId, _]) => remove(ref(db, `roster/${rosterId}`)));
        
        await Promise.all(rosterPromises);
      }

      // 2. Hapus semua attendance records yang terkait dengan roster guru
      const attendanceRef = ref(db, 'attendance');
      const attendanceSnapshot = await get(attendanceRef);
      const attendanceData = attendanceSnapshot.val();
      
      if (attendanceData) {
        const attendancePromises = Object.entries(attendanceData)
          .filter(([_, record]: [string, any]) => {
            const rosterEntry = rosterData && Object.values(rosterData)
              .find((entry: any) => entry.id === record.rosterId && entry.teacherId === id);
            return !!rosterEntry;
          })
          .map(([attendanceId, _]) => remove(ref(db, `attendance/${attendanceId}`)));
        
        await Promise.all(attendancePromises);
      }

      // 3. Terakhir, hapus data guru
      const teacherRef = ref(db, `teachers/${id}`);
      await remove(teacherRef);
    } catch (error) {
      console.error('Error deleting teacher permanently:', error);
      throw error;
    }
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
