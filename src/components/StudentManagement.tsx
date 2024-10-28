import React, { useState, useMemo, useEffect } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useBarak } from '../contexts/BarakContext'; // Ganti useAsrama dengan useBarak
import Papa from 'papaparse';
import { Edit, Trash2, Plus, FileText, History, Search, Users, User, Camera } from 'lucide-react';
import StudentLeaveHistory from './StudentLeaveHistory';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import useAlert from '../hooks/useAlert';
import { ref, onValue, get } from 'firebase/database'; // Hapus 'get' karena tidak digunakan
import { db } from '../firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import { exportStudent } from '../utils/exportStudent';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import Modal from '../components/Modal';
import { compressImage, formatFileSize } from '../utils/imageCompression';

// Update interface untuk tab
type TabType = 'active' | 'deleted';

const StudentManagement: React.FC = () => {
  const { students, allStudents, addStudent, updateStudent, deleteStudent, restoreStudent, deleteStudentPermanently } = useStudents(); // Tambahkan allStudents
  const { baraks } = useBarak(); // Ganti asramas dengan baraks
  const { user: currentUser } = useAuth();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    fullName: '',
    gender: 'Laki-laki', // Ini akan diset otomatis berdasarkan barak
    class: availableClasses[0],
    barak: ''
  });
  const [selectedGrade, setSelectedGrade] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const [groupedStudents, setGroupedStudents] = useState<Record<string, Student[]>>({ 'Semua Siswa': students });
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const { isOpen: isConfirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirmation();
  const { leaves, deleteLeave } = useStudentLeave();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Tambahkan useEffect untuk memantau perubahan user dan barakId
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const studentsRef = ref(db, 'students');
    const baraksRef = ref(db, 'baraks');

    const unsubscribeUsers = onValue(usersRef, async () => {
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.id}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        if (userData) {
          // Filter students berdasarkan tab yang aktif
          const filteredStudents = activeTab === 'active' 
            ? students.filter((student: Student) => !student.isDeleted)
            : allStudents.filter((student: Student) => student.isDeleted);

          if (currentUser.role === 'admin_master' || currentUser.role === 'admin_asrama') {
            // Admin master dan admin_asrama melihat semua siswa dikelompokkan per barak
            const groupedByBarak = filteredStudents.reduce((acc: Record<string, Student[]>, student: Student) => {
              if (!acc[student.barak]) {
                acc[student.barak] = [];
              }
              acc[student.barak].push(student);
              return acc;
            }, {} as Record<string, Student[]>);
            setGroupedStudents(groupedByBarak);
          } else if (currentUser.role === 'pengasuh' && currentUser.barakId) {
            // Pengasuh hanya melihat siswa di barak yang ditugaskan
            const barakIds = currentUser.barakId.split(',');
            const groupedStudents: Record<string, Student[]> = {};
            
            barakIds.forEach((barakId: string) => {
              const barak = baraks.find(b => b.id === barakId);
              if (barak) {
                const barakStudents = filteredStudents.filter((student: Student) => student.barak === barak.name);
                if (barakStudents.length > 0) {
                  groupedStudents[barak.name] = barakStudents;
                }
              }
            });

            setGroupedStudents(groupedStudents);
          }
        }
      }
    });

    // Tambahkan listener untuk perubahan pada students dan baraks
    const unsubscribeStudents = onValue(studentsRef, () => {
      // Trigger useEffect untuk memperbarui groupedStudents
    });

    const unsubscribeBaraks = onValue(baraksRef, () => {
      // Trigger useEffect untuk memperbarui groupedStudents
    });

    return () => {
      unsubscribeUsers();
      unsubscribeStudents();
      unsubscribeBaraks();
    };
  }, [currentUser?.id, students, allStudents, baraks, activeTab]);

  // Update fungsi untuk filter barak yang tersedia
  const availableBaraks = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'admin_master' || currentUser.role === 'admin_asrama') {
      return baraks; // Return semua barak
    }
    
    if (currentUser.role === 'pengasuh' && currentUser.barakId) {
      const barakIds = currentUser.barakId.split(',');
      return baraks.filter(barak => barakIds.includes(barak.id));
    }
    
    return [];
  }, [baraks, currentUser]);

  // Tambah fungsi untuk mendapatkan gender dari barak
  const getBarakGender = (barakName: string): 'Laki-laki' | 'Perempuan' => {
    const barak = baraks.find(b => b.name === barakName);
    return barak?.gender || 'Laki-laki';
  };

  // Update handler untuk pemilihan barak
  const handleBarakSelect = (barakName: string) => {
    const gender = getBarakGender(barakName);
    setNewStudent({
      ...newStudent,
      barak: barakName,
      gender: gender // Set gender otomatis berdasarkan barak
    });
  };

  // Update handleAddOrUpdateStudent
  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        setIsModalOpen(false);
        const confirmed = await confirm({
          title: 'Konfirmasi Perubahan',
          message: 'Anda yakin ingin melakukan perubahan data siswa? Perubahan tidak dapat dikembalikan.',
          confirmText: 'Ya, Ubah',
          cancelText: 'Batal'
        });

        if (confirmed) {
          await updateStudent(editingStudent.id, newStudent, selectedPhoto || undefined);
          showAlert({
            type: 'success',
            message: 'Data siswa berhasil diperbarui'
          });
          resetForm();
        } else {
          // Reset foto jika user membatalkan
          setSelectedPhoto(null);
          setPhotoPreview(editingStudent.photoUrl || null);
          setIsModalOpen(true);
          return;
        }
      } else {
        await addStudent(newStudent, selectedPhoto || undefined);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil ditambahkan'
        });
        resetForm();
        setIsModalOpen(false);
      }
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data siswa'
      });
    }
  };

  const resetForm = () => {
    setNewStudent({
      fullName: '',
      gender: 'Laki-laki',
      class: availableClasses[0],
      barak: ''
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setSelectedGrade('');
    setEditingStudent(null);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Check file size before compression
        const originalSize = formatFileSize(file.size);
        
        // Compress image
        const compressedFile = await compressImage(file);
        const compressedSize = formatFileSize(compressedFile.size);
        
        setSelectedPhoto(compressedFile);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);

        showAlert({
          type: 'success',
          message: `Foto berhasil dikompres dari ${originalSize} menjadi ${compressedSize}`,
          duration: 5000
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal mengkompress foto. Silakan coba lagi.',
          duration: 5000
        });
      }
    }
  };

  // Update handleEdit
  const handleEdit = (student: Student) => {
    // Admin master memiliki akses penuh untuk edit
    if (currentUser?.role === 'admin_master') {
      setEditingStudent(student);
      setNewStudent(student);
      const grade = student.class.split('-')[0] as 'X' | 'XI' | 'XII';
      setSelectedGrade(grade);
      setIsModalOpen(true);
      return;
    }

    // Validasi akses barak saat edit untuk role lain
    const studentBarak = baraks.find(b => b.name === student.barak);
    if (!studentBarak || !hasAccessToBarak(student.barak)) {
      showAlert({
        type: 'error',
        message: 'Anda tidak memiliki akses untuk mengedit siswa dari barak ini'
      });
      return;
    }

    setEditingStudent(student);
    setNewStudent(student);
    const grade = student.class.split('-')[0] as 'X' | 'XI' | 'XII';
    setSelectedGrade(grade);
    setIsModalOpen(true);
  };

  // Update handleDelete
  const handleDelete = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    // Admin master memiliki akses penuh untuk delete
    if (currentUser?.role === 'admin_master') {
      const confirmed = await confirm({
        title: 'Konfirmasi Hapus',
        message: 'Apakah Anda yakin ingin menghapus siswa ini?',
        confirmText: 'Hapus',
        cancelText: 'Batal'
      });

      if (confirmed) {
        try {
          await deleteStudent(id);
          showAlert({
            type: 'success',
            message: 'Data siswa berhasil dihapus'
          });
        } catch (error) {
          showAlert({
            type: 'error',
            message: 'Gagal menghapus data siswa'
          });
        }
      }
      return;
    }

    // Validasi akses barak saat hapus untuk role lain
    if (!hasAccessToBarak(student.barak)) {
      showAlert({
        type: 'error',
        message: 'Anda tidak memiliki akses untuk menghapus siswa dari barak ini'
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus siswa ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteStudent(id);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus data siswa'
        });
      }
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const importedStudents = results.data.slice(1).map((row: any) => ({
            fullName: row[0],
            gender: row[1] === 'Male' ? 'Laki-laki' : 'Perempuan',
            class: row[2],
            barak: row[3]
          }));
          importedStudents.forEach(student => {
            if (student.fullName && (student.gender === 'Laki-laki' || student.gender === 'Perempuan') && student.class && student.barak) {
              addStudent(student as Omit<Student, 'id'>);
            }
          });
          showAlert({
            type: 'success',
            message: 'Data siswa berhasil diimpor'
          });
        },
        header: true,
        skipEmptyLines: true
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportStudent({
        students,
        baraks
      });
      showAlert({
        type: 'success',
        message: 'Data siswa berhasil diekspor'
      });
    } catch (error) {
      console.error('Error exporting students:', error);
      showAlert({
        type: 'error',
        message: 'Gagal mengekspor data siswa'
      });
    }
  };

  const openModal = () => {
    setEditingStudent(null);
    setSelectedGrade(''); // Reset selectedGrade
    setNewStudent({
      fullName: '',
      gender: 'Laki-laki',
      class: availableClasses[0],
      barak: ''
    });
    setIsModalOpen(true);
  };

  // Update fungsi hasAccessToBarak
  const hasAccessToBarak = (barakName: string) => {
    if (!currentUser) return false;
    
    // Admin master dan admin_asrama punya akses ke semua barak
    if (currentUser.role === 'admin_master' || currentUser.role === 'admin_asrama') {
      return true;
    }
    
    // Pengasuh hanya punya akses ke barak yang ditugaskan
    if (currentUser.role === 'pengasuh' && currentUser.barakId) {
      const userBarakIds = currentUser.barakId.split(',');
      const userBaraks = baraks
        .filter(b => userBarakIds.includes(b.id))
        .map(b => b.name);
      
      return userBaraks.includes(barakName);
    }
    
    return false;
  };

  // Update fungsi handleRestore
  const handleRestore = async (studentId: string) => {
    const shouldRestore = await confirm({
      title: 'Konfirmasi Pemulihan',
      message: 'Apakah Anda yakin ingin memulihkan siswa ini? Semua data perizinan siswa akan kembali aktif.',
      confirmText: 'Ya, Pulihkan',
      cancelText: 'Batal'
    });

    if (shouldRestore) {
      try {
        await restoreStudent(studentId);
        showAlert({
          type: 'success',
          message: 'Siswa berhasil dipulihkan'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal memulihkan siswa'
        });
      }
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Konfirmasi Hapus Permanen',
      message: 'Apakah Anda yakin ingin menghapus siswa ini secara permanen? Semua perizinan siswa ini akan hilang jika dihapus!!!.',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        // Hapus perizinan siswa terlebih dahulu
        const studentLeaves = leaves.filter(leave => leave.studentId === id);
        await Promise.all(studentLeaves.map(leave => deleteLeave(leave.id)));
        
        // Kemudian hapus siswa
        await deleteStudentPermanently(id);
        showAlert({
          type: 'success',
          message: 'Siswa dan semua perizinannya berhasil dihapus secara permanen'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus siswa secara permanen'
        });
      }
    }
  };

  // Update renderStudentTable
  const renderStudentTable = (students: Student[], barakName: string) => {
    if (!students || students.length === 0) {
      return (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">No</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Foto</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="hidden md:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                <th className="hidden sm:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(10)].map((_, index) => (
                <tr key={index}>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-2 py-3 text-sm text-gray-500">-</td>
                  <td className="px-2 py-3 text-sm text-gray-500">-</td>
                  <td className="hidden md:table-cell px-2 py-3 text-sm text-gray-500">-</td>
                  <td className="hidden sm:table-cell px-2 py-3 text-sm text-gray-500">-</td>
                  <td className="px-2 py-3 text-right text-sm text-gray-500">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const canEditBarak = hasAccessToBarak(barakName);
    const emptyRows = Math.max(0, 10 - students.length);

    return (
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">No</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Foto</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="hidden md:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
              <th className="hidden sm:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => (
              <tr key={student.id} className="group hover:bg-gray-50">
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                <td className="px-2 py-3">
                  <div 
                    className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => student.photoUrl && setPreviewPhoto(student.photoUrl)}
                  >
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                  {/* Tampilkan kelas di mobile */}
                  <div className="md:hidden text-xs text-gray-500 mt-1">
                    {student.class}
                  </div>
                </td>
                <td className="hidden md:table-cell px-2 py-3 text-sm text-gray-500">{student.class}</td>
                <td className="hidden sm:table-cell px-2 py-3">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    student.gender === 'Laki-laki' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-pink-100 text-pink-800'
                  }`}>
                    {student.gender}
                  </span>
                </td>
                <td className="px-2 py-3 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-1">
                    {activeTab === 'active' && canEditBarak ? (
                      <>
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : activeTab === 'deleted' ? (
                      <>
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Pulihkan"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(student.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                    <button
                      onClick={() => setSelectedStudentForHistory(student)}
                      className="text-indigo-600 hover:text-indigo-900 p-1"
                      title="Lihat Riwayat"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Empty rows */}
            {[...Array(emptyRows)].map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">{students.length + index + 1}</td>
                <td className="px-2 py-3 text-sm text-gray-500">-</td>
                <td className="px-2 py-3 text-sm text-gray-500">-</td>
                <td className="hidden md:table-cell px-2 py-3 text-sm text-gray-500">-</td>
                <td className="hidden sm:table-cell px-2 py-3 text-sm text-gray-500">-</td>
                <td className="px-2 py-3 text-right text-sm text-gray-500">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {/* Alert dan ConfirmationModal */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmOptions?.title ?? ''}
        message={confirmOptions?.message ?? ''}
        confirmText={confirmOptions?.confirmText ?? 'Konfirmasi'}
        cancelText={confirmOptions?.cancelText ?? 'Batal'}
      />

      {/* Header dengan Search dan Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari siswa..."
            className="w-full p-2 pl-8 border rounded-lg"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Tambah Siswa</span>
          </button>
          <label className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 cursor-pointer">
            <Plus size={18} />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button 
            onClick={handleExportCSV}
            className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border border-gray-200 p-1 mt-4">
        <nav className="flex space-x-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'active'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Siswa Aktif
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'deleted'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Siswa Terhapus
          </button>
        </nav>
      </div>

      {/* Main Content Panel */}
      <div className={`grid grid-cols-1 ${
        Object.keys(groupedStudents).length > 1 ? 'lg:grid-cols-2' : ''
      } gap-4 mt-4`}>
        {Object.entries(groupedStudents).map(([barakName, students]) => (
          <div key={barakName} className={`rounded-lg shadow-sm border border-gray-200 overflow-hidden ${
            Object.keys(groupedStudents).length === 1 ? 'col-span-full' : ''
          }`}>
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{barakName}</h3>
            </div>
            <div className="p-4">
              {renderStudentTable(students, barakName)}
            </div>
          </div>
        ))}

        {Object.keys(groupedStudents).length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-12 rounded-lg shadow-sm border border-gray-200">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeTab === 'active' ? 'Tidak ada siswa aktif' : 'Tidak ada siswa terhapus'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'active' 
                  ? 'Mulai dengan menambahkan siswa baru'
                  : 'Semua siswa masih aktif'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Student Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm(); // Reset semua form termasuk foto
        }}
        title={editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
      >
        <form onSubmit={handleAddOrUpdateStudent} className="space-y-4">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                {photoPreview || (editingStudent?.photoUrl) ? (
                  <img
                    src={photoPreview || editingStudent?.photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50">
                  <Camera className="w-4 h-4 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={newStudent.fullName}
              onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
              className="w-full p-2.5 text-sm border rounded-md"
              required
            />
          </div>

          {/* Tingkat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tingkat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['X', 'XI', 'XII'].map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade as 'X' | 'XI' | 'XII')}
                  className={`p-2.5 rounded-md transition-colors ${
                    selectedGrade === grade
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Kelas */}
          {selectedGrade && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kelas
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNewStudent({ ...newStudent, class: `${selectedGrade}-${num}` })}
                    className={`p-2.5 rounded-md transition-colors ${
                      newStudent.class === `${selectedGrade}-${num}`
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {`${selectedGrade}-${num}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barak */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barak
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {availableBaraks.map((barak) => (
                <button
                  key={barak.id}
                  type="button"
                  onClick={() => handleBarakSelect(barak.name)}
                  className={`p-2.5 rounded-md transition-colors ${
                    newStudent.barak === barak.name
                      ? barak.gender === 'Laki-laki'
                        ? 'bg-blue-500 text-white'
                        : 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {barak.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm(); // Reset semua form termasuk foto saat cancel
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!newStudent.barak}
              className={`px-4 py-2 rounded-lg ${
                !newStudent.barak
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {editingStudent ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student History Modal */}
      {selectedStudentForHistory && (
        <StudentLeaveHistory
          student={selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative bg-white rounded-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={previewPhoto}
              alt="Student"
              className="w-[400px] h-[400px] object-cover" // Ukuran fix 400x400
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentManagement;
