import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Student } from '../types';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase'; // Pastikan storage sudah diexport dari firebase.ts

interface StudentContextType {
  students: Student[];
  allStudents: Student[];
  addStudent: (student: Omit<Student, 'id'>, photoFile?: File) => Promise<void>;
  updateStudent: (id: string, student: Omit<Student, 'id'>, photoFile?: File) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  restoreStudent: (id: string) => Promise<void>;
  deleteStudentPermanently: (id: string) => Promise<void>;
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

  const uploadPhoto = async (file: File, studentId: string): Promise<string> => {
    const fileRef = storageRef(storage, `student-photos/${studentId}/${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const addStudent = async (student: Omit<Student, 'id'>, photoFile?: File) => {
    const studentsRef = ref(db, 'students');
    const newStudentRef = push(studentsRef);
    
    if (photoFile) {
      const photoUrl = await uploadPhoto(photoFile, newStudentRef.key!);
      await update(newStudentRef, { ...student, photoUrl });
    } else {
      await update(newStudentRef, student);
    }
  };

  const updateStudent = async (id: string, updatedStudent: Omit<Student, 'id'>, photoFile?: File) => {
    const studentRef = ref(db, `students/${id}`);
    
    if (photoFile) {
      const photoUrl = await uploadPhoto(photoFile, id);
      await update(studentRef, { ...updatedStudent, photoUrl });
    } else {
      await update(studentRef, updatedStudent);
    }
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

  const deleteStudentPermanently = async (id: string) => {
    const studentRef = ref(db, `students/${id}`);
    await remove(studentRef);
  };

  return (
    <StudentContext.Provider value={{
      students,
      allStudents,
      addStudent,
      updateStudent,
      deleteStudent,
      restoreStudent,
      deleteStudentPermanently
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
