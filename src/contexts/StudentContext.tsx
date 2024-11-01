import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
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
  promoteStudents: () => Promise<{ hasGraduatingStudents: boolean }>;
  graduateStudents: () => Promise<void>;
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

  const uploadPhoto = async (file: File, studentId: string, student: Omit<Student, 'id'>): Promise<string> => {
    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Create filename: nama_siswa_kelas_barak.extension
    const fileName = `${student.fullName.replace(/\s+/g, '_')}_${student.class}_${student.barak.replace(/\s+/g, '_')}.${extension}`;
    
    // Create reference with new filename
    const fileRef = storageRef(storage, `student-photos/${studentId}/${fileName}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const addStudent = async (student: Omit<Student, 'id'>, photoFile?: File) => {
    const studentsRef = ref(db, 'students');
    const newStudentRef = push(studentsRef);
    
    if (photoFile) {
      const photoUrl = await uploadPhoto(photoFile, newStudentRef.key!, student);
      await update(newStudentRef, { ...student, photoUrl });
    } else {
      await update(newStudentRef, student);
    }
  };

  const updateStudent = async (id: string, updatedStudent: Omit<Student, 'id'>, photoFile?: File) => {
    const studentRef = ref(db, `students/${id}`);
    
    if (photoFile) {
      const photoUrl = await uploadPhoto(photoFile, id, updatedStudent);
      await update(studentRef, { ...updatedStudent, photoUrl });
    } else {
      await update(studentRef, updatedStudent);
    }
  };

  // Update deleteStudent untuk menangani siswa lulusan
  const deleteStudent = async (id: string) => {
    const studentRef = ref(db, `students/${id}`);
    const student = students.find(s => s.id === id) || allStudents.find(s => s.id === id);
    
    if (student) {
      if (student.status === 'Lulus' && !student.isDeleted) {
        // Soft delete untuk lulusan yang belum dihapus
        await update(studentRef, { 
          ...student,
          isDeleted: true
        });
      } else if (student.status === 'Lulus' && student.isDeleted) {
        // Delete permanent untuk lulusan yang sudah di soft delete
        await remove(studentRef);
      } else {
        // Soft delete biasa untuk siswa aktif
        await update(studentRef, { 
          ...student,
          isDeleted: true
        });
      }
    }
  };

  // Update restoreStudent untuk mempertahankan status saat restore
  const restoreStudent = async (id: string) => {
    const studentRef = ref(db, `students/${id}`);
    const student = allStudents.find(s => s.id === id);
    
    if (student) {
      await update(studentRef, { 
        ...student,
        isDeleted: false,
        // Pertahankan status saat restore
        status: student.status
      });
    }
  };

  const promoteStudents = async () => {
    try {
      const updates: { [key: string]: any } = {};
      const currentYear = new Date().getFullYear();
      let hasGraduatingStudents = false;
      
      students.forEach(student => {
        if (!student.isDeleted && student.status === 'Aktif') {
          const [grade, number] = student.class.split('-');
          
          // Untuk kelas XII, masukkan ke lulusan (tidak dihapus)
          if (grade === 'XII') {
            updates[`students/${student.id}`] = {
              ...student,
              status: 'Lulus',
              graduationYear: currentYear.toString(),
              isDeleted: false // Ubah menjadi false agar muncul di tab lulusan
            };
            hasGraduatingStudents = true;
          }
          // Promosi X ke XI, XI ke XII
          else if (grade === 'X') {
            updates[`students/${student.id}`] = {
              ...student,
              class: `XI-${number}`
            };
          } else if (grade === 'XI') {
            updates[`students/${student.id}`] = {
              ...student,
              class: `XII-${number}`
            };
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        const dbRef = ref(db);
        await update(dbRef, updates);
      }

      return { hasGraduatingStudents };
    } catch (error) {
      console.error('Error promoting students:', error);
      throw error;
    }
  };

  const graduateStudents = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const updates: { [key: string]: any } = {};
      
      students.forEach(student => {
        if (!student.isDeleted && student.status === 'Aktif') {
          const [grade] = student.class.split('-');
          
          // Arsipkan siswa kelas XII
          if (grade === 'XII') {
            updates[`students/${student.id}`] = {
              ...student,
              status: 'Lulus',
              graduationYear: currentYear.toString(),
              isDeleted: true
            };
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        const dbRef = ref(db);
        await update(dbRef, updates);
      }
    } catch (error) {
      console.error('Error graduating students:', error);
      throw error;
    }
  };

  const deleteStudentPermanently = async (id: string) => {
    try {
      // 1. Hapus data siswa
      const studentRef = ref(db, `students/${id}`);
      await remove(studentRef);

      // 2. Hapus semua perizinan siswa
      const leavesRef = ref(db, 'studentLeaves');
      const leavesSnapshot = await get(leavesRef);
      const leavesData = leavesSnapshot.val();
      if (leavesData) {
        const updates: { [key: string]: null } = {};
        Object.entries(leavesData).forEach(([leaveId, leave]: [string, any]) => {
          if (leave.studentId === id) {
            updates[`studentLeaves/${leaveId}`] = null;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }

      // 3. Hapus semua pelanggaran dan pembinaan siswa
      const violationsRef = ref(db, 'violations');
      const violationsSnapshot = await get(violationsRef);
      const violationsData = violationsSnapshot.val();
      if (violationsData) {
        const violationUpdates: { [key: string]: null } = {};
        const violationIds: string[] = [];
        
        Object.entries(violationsData).forEach(([violationId, violation]: [string, any]) => {
          if (violation.studentId === id) {
            violationUpdates[`violations/${violationId}`] = null;
            violationIds.push(violationId);
          }
        });

        // 4. Hapus pembinaan terkait pelanggaran
        const guidancesRef = ref(db, 'guidances');
        const guidancesSnapshot = await get(guidancesRef);
        const guidancesData = guidancesSnapshot.val();
        if (guidancesData) {
          Object.entries(guidancesData).forEach(([guidanceId, guidance]: [string, any]) => {
            if (violationIds.includes(guidance.violationId)) {
              violationUpdates[`guidances/${guidanceId}`] = null;
            }
          });
        }

        if (Object.keys(violationUpdates).length > 0) {
          await update(ref(db), violationUpdates);
        }
      }
    } catch (error) {
      console.error('Error permanently deleting student:', error);
      throw error;
    }
  };

  return (
    <StudentContext.Provider value={{
      students,
      allStudents,
      addStudent,
      updateStudent,
      deleteStudent,
      restoreStudent,
      deleteStudentPermanently,
      promoteStudents,
      graduateStudents
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
