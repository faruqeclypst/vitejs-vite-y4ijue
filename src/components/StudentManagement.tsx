import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useBarak } from '../contexts/BarakContext';
import Papa from 'papaparse';
import { Edit, Trash2, Plus, FileText, History, Search, Users, User, Camera, MoreVertical, ArrowUpCircle } from 'lucide-react';
import StudentLeaveHistory from './StudentLeaveHistory';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from '../components/ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import { exportStudent } from '../utils/exportStudent';
import Modal from '../components/Modal';
import { compressImage, formatFileSize } from '../utils/imageCompression';
import LoadingSpinner from './common/LoadingSpinner';

// Update interface untuk tab
type TabType = 'active' | 'deleted' | 'deleted_graduated' | 'graduated';

// Tambahkan interface untuk props
interface StudentManagementProps {
  initialTab?: TabType;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ initialTab }) => {
  const { students, allStudents, addStudent, updateStudent, deleteStudent, restoreStudent, deleteStudentPermanently, promoteStudents } = useStudents(); // Tambahkan allStudents
  const { baraks } = useBarak(); // Ganti asramas dengan baraks
  const { user: currentUser } = useAuth();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    fullName: '',
    gender: 'Laki-laki',
    class: availableClasses[0],
    barak: '',
    status: 'Aktif'
  });
  const [selectedGrade, setSelectedGrade] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const [groupedStudents, setGroupedStudents] = useState<Record<string, Student[]>>({ 'Semua Siswa': students });
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'active');
  const { isOpen: isConfirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tambahkan fungsi untuk mendapatkan tahun-tahun lulusan yang tersedia
  const graduationYears = useMemo(() => {
    const years = new Set<string>();
    allStudents
      .filter(s => s.status === 'Lulus' && s.graduationYear)
      .forEach(s => years.add(s.graduationYear!));
    return ['all', ...Array.from(years)].sort().reverse();
  }, [allStudents]);

  // Tambahkan useEffect untuk memantau perubahan user dan barakId
  useEffect(() => {
    setIsLoading(true);
    handleData().finally(() => setIsLoading(false));
  }, [currentUser?.id, students, allStudents, activeTab, selectedYear]);

  // Tambahkan useEffect untuk menutup menu saat klik di luar
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, newStudent, selectedPhoto || undefined);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil diperbarui'
        });
        resetForm();
        setIsModalOpen(false);
      } else {
        await addStudent(newStudent, selectedPhoto || undefined);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil ditambahkan'
        });
        resetForm();
        setIsModalOpen(false);
        setActiveTab('active');
      }
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data siswa'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewStudent({
      fullName: '',
      gender: 'Laki-laki',
      class: availableClasses[0],
      barak: '',
      status: 'Aktif'
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
    // Admin master dan admin_asrama memiliki akses penuh untuk edit
    if (currentUser?.role === 'admin_master' || currentUser?.role === 'admin_asrama') {
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
    const student = students.find(s => s.id === id) || allStudents.find(s => s.id === id);
    if (!student) return;

    // Admin master dan admin_asrama memiliki akses penuh untuk delete
    if (currentUser?.role === 'admin_master' || currentUser?.role === 'admin_asrama') {
      const message = student.status === 'Lulus' 
        ? student.isDeleted
          ? 'Apakah Anda yakin ingin menghapus data lulusan ini secara permanen? Data tidak dapat dikembalikan.'
          : 'Apakah Anda yakin ingin menghapus data lulusan ini? Data akan dipindahkan ke tab Lulusan Terhapus.'
        : 'Apakah Anda yakin ingin menghapus siswa ini?';

      const confirmed = await confirm({
        title: 'Konfirmasi Hapus',
        message,
        confirmText: 'Hapus',
        cancelText: 'Batal'
      });

      if (confirmed) {
        try {
          await deleteStudent(id);
          
          showAlert({
            type: 'success',
            message: student.status === 'Lulus'
              ? student.isDeleted
                ? 'Data lulusan berhasil dihapus permanen'
                : 'Data lulusan berhasil dipindahkan ke tab Lulusan Terhapus'
              : 'Data siswa berhasil dihapus'
          });

          // Tetap di tab yang sama jika di tab lulusan
          if (activeTab === 'graduated') {
            setActiveTab('graduated');
          }
        } catch (error) {
          showAlert({
            type: 'error',
            message: 'Gagal menghapus data'
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
    setSelectedGrade('');
    setNewStudent({
      fullName: '',
      gender: 'Laki-laki',
      class: availableClasses[0],
      barak: '',
      status: 'Aktif'
    });
    setIsModalOpen(true);
  };

  // Update fungsi hasAccessToBarak
  const hasAccessToBarak = (barakName: string) => {
    if (!currentUser) return false;
    
    // Admin master dan admin_asrama memiliki akses penuh
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
  const handleRestore = async (id: string) => {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    const confirmed = await confirm({
      title: 'Konfirmasi Pemulihan',
      message: student.status === 'Lulus'
        ? 'Apakah Anda yakin ingin memulihkan data lulusan ini ke tab Lulusan?'
        : 'Apakah Anda yakin ingin memulihkan siswa ini?',
      confirmText: 'Ya, Pulihkan',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await restoreStudent(id);
        showAlert({
          type: 'success',
          message: student.status === 'Lulus'
            ? 'Data lulusan berhasil dipulihkan ke tab Lulusan'
            : 'Siswa berhasil dipulihkan'
        });

        // Tetap di tab yang sama
        if (activeTab === 'deleted_graduated') {
          setActiveTab('deleted_graduated');
        }
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal memulihkan data'
        });
      }
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    const confirmed = await confirm({
      title: 'Konfirmasi Hapus Permanen',
      message: 'Apakah Anda yakin ingin menghapus data lulusan ini secara permanen? Data tidak dapat dikembalikan!',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteStudentPermanently(id);
        showAlert({
          type: 'success',
          message: 'Data lulusan berhasil dihapus permanen'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus data lulusan secara permanen'
        });
      }
    }
  };

  // Update renderStudentTable
  const renderStudentTable = (students: Student[], barakName: string) => {
    if (!students || students.length === 0) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">No</th>
                <th className="px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%] sm:w-[15%]">Foto</th>
                <th className="px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="hidden md:table-cell px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                <th className="hidden sm:table-cell px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-1 sm:px-2 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%] sm:w-[15%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(10)].map((_, index) => (
                <tr key={index}>
                  <td className="px-1 sm:px-2 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                  <td className="px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                  <td className="hidden md:table-cell px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                  <td className="hidden sm:table-cell px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                  <td className="px-1 sm:px-2 py-2 sm:py-3 text-right text-sm text-gray-500">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Update logika akses untuk admin_asrama
    const canManageAlumni = currentUser?.role === 'admin_master' || currentUser?.role === 'admin_asrama';
    const canEditBarak = hasAccessToBarak(barakName);
    const emptyRows = Math.max(0, 10 - students.length);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">No</th>
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%] sm:w-[15%]">Foto</th>
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="hidden md:table-cell px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
              <th className="hidden sm:table-cell px-1 sm:px-2 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%] sm:w-[15%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => (
              <tr key={student.id} className="group hover:bg-gray-50">
                <td className="px-1 sm:px-2 py-2 sm:py-3 whitespace-nowrap">{index + 1}</td>
                <td className="px-1 sm:px-2 py-2 sm:py-3">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
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
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-1 sm:px-2 py-2 sm:py-3">
                  <div className="font-medium text-gray-900">{student.fullName}</div>
                  <div className="md:hidden text-xs text-gray-500 mt-0.5">
                    {student.class}
                  </div>
                </td>
                <td className="hidden md:table-cell px-1 sm:px-2 py-2 sm:py-3 text-gray-500">{student.class}</td>
                <td className="hidden sm:table-cell px-1 sm:px-2 py-2 sm:py-3">
                  <span className={`px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    student.gender === 'Laki-laki' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-pink-100 text-pink-800'
                  }`}>
                    {student.gender}
                  </span>
                </td>
                <td className="px-1 sm:px-2 py-2 sm:py-3 text-right font-medium">
                  <div className="hidden sm:flex justify-end space-x-0.5 sm:space-x-1">
                    {activeTab === 'active' && canEditBarak ? (
                      <>
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 p-0.5 sm:p-1"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900 p-0.5 sm:p-1"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </>
                    ) : activeTab === 'deleted' && canEditBarak ? (
                      <>
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 p-0.5 sm:p-1"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="text-green-600 hover:text-green-900 p-0.5 sm:p-1"
                          title="Pulihkan"
                        >
                          <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(student.id)}
                          className="text-red-600 hover:text-red-900 p-0.5 sm:p-1"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </>
                    ) : (activeTab === 'graduated' || activeTab === 'deleted_graduated') && canManageAlumni ? (
                      <>
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 p-0.5 sm:p-1"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        {activeTab === 'graduated' ? (
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="text-red-600 hover:text-red-900 p-0.5 sm:p-1"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(student.id)}
                              className="text-green-600 hover:text-green-900 p-0.5 sm:p-1"
                              title="Pulihkan ke Lulusan"
                            >
                              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(student.id)}
                              className="text-red-600 hover:text-red-900 p-0.5 sm:p-1"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          </>
                        )}
                      </>
                    ) : null}
                    <button
                      onClick={() => setSelectedStudentForHistory(student)}
                      className="text-indigo-600 hover:text-indigo-900 p-0.5 sm:p-1"
                      title="Lihat Riwayat"
                    >
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>

                  {/* Mobile menu */}
                  <div className="sm:hidden relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === student.id ? null : student.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>

                    {openMenuId === student.id && (
                      <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu">
                          {activeTab === 'active' && canEditBarak ? (
                            <>
                              <button
                                onClick={() => {
                                  handleEdit(student);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(student.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus
                              </button>
                            </>
                          ) : activeTab === 'deleted' && canEditBarak ? (
                            <>
                              <button
                                onClick={() => {
                                  handleEdit(student);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleRestore(student.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <History className="h-4 w-4" />
                                Pulihkan
                              </button>
                              <button
                                onClick={() => {
                                  handlePermanentDelete(student.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus Permanen
                              </button>
                            </>
                          ) : (activeTab === 'graduated' || activeTab === 'deleted_graduated') && canManageAlumni ? (
                            <>
                              <button
                                onClick={() => {
                                  handleEdit(student);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              {activeTab === 'graduated' ? (
                                <button
                                  onClick={() => handleDelete(student.id)}
                                  className="text-red-600 hover:text-red-900 p-0.5 sm:p-1"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleRestore(student.id)}
                                    className="text-green-600 hover:text-green-900 p-0.5 sm:p-1"
                                    title="Pulihkan ke Lulusan"
                                  >
                                    <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                  <button
                                    onClick={() => handlePermanentDelete(student.id)}
                                    className="text-red-600 hover:text-red-900 p-0.5 sm:p-1"
                                    title="Hapus Permanen"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                </>
                              )}
                            </>
                          ) : null}
                          <button
                            onClick={() => {
                              setSelectedStudentForHistory(student);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-indigo-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Lihat Riwayat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {/* Empty rows */}
            {[...Array(emptyRows)].map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="px-1 sm:px-2 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-500">{students.length + index + 1}</td>
                <td className="px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                <td className="px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                <td className="hidden md:table-cell px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                <td className="hidden sm:table-cell px-1 sm:px-2 py-2 sm:py-3 text-sm text-gray-500">-</td>
                <td className="px-1 sm:px-2 py-2 sm:py-3 text-right text-sm text-gray-500">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handlePromoteStudents = async () => {
    // Hanya admin_master dan admin_asrama yang bisa melakukan kenaikan kelas
    if (currentUser?.role !== 'admin_master' && currentUser?.role !== 'admin_asrama') {
      showAlert({
        type: 'error',
        message: 'Anda tidak memiliki akses untuk melakukan kenaikan kelas'
      });
      return;
    }

    const hasClass12 = students.some(student => 
      !student.isDeleted && 
      student.status === 'Aktif' && 
      student.class.startsWith('XII')
    );

    const message = hasClass12 
      ? 'Anda yakin ingin melakukan kenaikan kelas? Siswa kelas XII akan diarsipkan sebagai lulusan dan dapat dilihat di tab Lulusan.'
      : 'Anda yakin ingin melakukan kenaikan kelas untuk semua siswa? Proses ini tidak dapat dibatalkan.';

    const confirmed = await confirm({
      title: 'Konfirmasi Kenaikan Kelas',
      message,
      confirmText: 'Ya, Naikkan Kelas',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        const result = await promoteStudents();
        
        showAlert({
          type: 'success',
          message: result.hasGraduatingStudents 
            ? 'Kenaikan kelas berhasil dilakukan. Siswa kelas XII telah diarsipkan sebagai lulusan.'
            : 'Kenaikan kelas berhasil dilakukan'
        });

        // Pindah ke tab lulusan jika ada siswa yang lulus
        if (result.hasGraduatingStudents) {
          setActiveTab('graduated');
        } else {
          setActiveTab('active');
        }
        
      } catch (error) {
        console.error('Error promoting students:', error);
        showAlert({
          type: 'error',
          message: 'Gagal melakukan kenaikan kelas'
        });
      }
    }
  };

  const handleData = async () => {
    if (!currentUser) return;

    // Filter students berdasarkan tab yang aktif dan role
    let filteredStudents = activeTab === 'active' 
      ? students.filter(s => !s.isDeleted && s.status === 'Aktif')
      : activeTab === 'deleted'
      ? allStudents.filter(s => s.isDeleted && s.status === 'Aktif')
      : activeTab === 'deleted_graduated'
      ? allStudents.filter(s => s.isDeleted && s.status === 'Lulus')
      : activeTab === 'graduated'
      ? allStudents.filter(s => !s.isDeleted && s.status === 'Lulus')
      : [];

    // Tambahkan filter tahun untuk tab lulusan
    if ((activeTab === 'graduated' || activeTab === 'deleted_graduated') && selectedYear !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.graduationYear === selectedYear);
    }

    // Group students berdasarkan tab
    if (activeTab === 'graduated' || activeTab === 'deleted_graduated') {
      const groupedByYear = filteredStudents.reduce((acc: Record<string, Student[]>, student: Student) => {
        const year = student.graduationYear || 'Tanpa Tahun';
        const groupKey = `Lulusan ${year}`;
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(student);
        return acc;
      }, {});
      setGroupedStudents(groupedByYear);
    } else {
      // Group by barak
      const groupedByBarak = filteredStudents.reduce((acc: Record<string, Student[]>, student: Student) => {
        if (!acc[student.barak]) acc[student.barak] = [];
        acc[student.barak].push(student);
        return acc;
      }, {});
      setGroupedStudents(groupedByBarak);
    }
  };

  // Tampilkan loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

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

      {/* Header dengan Search, Tabs, dan Actions */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari siswa..."
              className="w-full p-2 pl-8 border rounded-lg"
            />
            <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={openModal}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Tambah Siswa</span>
            </button>
            <label className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 cursor-pointer">
              <Plus size={18} />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
            <button 
              onClick={handleExportCSV}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Student Management Section */}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-500 mb-2">Manajemen Siswa</div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'active'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Siswa Aktif
              </button>
              <button
                onClick={() => setActiveTab('deleted')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'deleted'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Siswa Terhapus
              </button>
            </div>
          </div>

          {/* Alumni Management Section */}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-500 mb-2">Manajemen Alumni</div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('graduated')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'graduated'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Lulusan
              </button>
              <button
                onClick={() => setActiveTab('deleted_graduated')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'deleted_graduated'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Lulusan Terhapus
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons - Conditional rendering berdasarkan tab */}
        <div className="flex justify-end gap-2">
          {/* Kenaikan Kelas Button - Hanya muncul di tab active dan deleted */}
          {currentUser?.role === 'admin_master' && (activeTab === 'active' || activeTab === 'deleted') && (
            <button
              onClick={handlePromoteStudents}
              className="bg-green-500 text-white h-10 w-48 px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 text-sm"
            >
              <ArrowUpCircle size={18} />
              <span>Kenaikan Kelas</span>
            </button>
          )}

          {/* Filter Tahun - Hanya muncul di tab graduated dan deleted_graduated */}
          {(activeTab === 'graduated' || activeTab === 'deleted_graduated') && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 w-48 px-4 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Tahun Lulusan</option>
              {graduationYears
                .filter(year => year !== 'all')
                .map(year => (
                  <option key={year} value={year}>
                    Lulusan {year}
                  </option>
                ))
              }
            </select>
          )}
        </div>
      </div>

      {/* Main Content Panel */}
      <div className={`grid grid-cols-1 ${
        Object.keys(groupedStudents).length > 1 ? 'lg:grid-cols-2' : ''
      } gap-4`}>
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
                {activeTab === 'active' 
                  ? 'Tidak ada siswa aktif' 
                  : activeTab === 'deleted'
                  ? 'Tidak ada siswa terhapus'
                  : activeTab === 'deleted_graduated'
                  ? 'Tidak ada lulusan yang terhapus'
                  : 'Tidak ada siswa lulusan'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'active' 
                  ? 'Mulai dengan menambahkan siswa baru'
                  : activeTab === 'deleted'
                  ? 'Tidak ada data siswa yang dihapus'
                  : activeTab === 'deleted_graduated'
                  ? 'Tidak ada data lulusan yang dihapus'
                  : 'Belum ada data siswa lulusan'}
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
              disabled={!newStudent.barak || isSubmitting}
              className={`px-4 py-2 rounded-lg ${
                !newStudent.barak || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </div>
              ) : (
                editingStudent ? 'Update' : 'Simpan'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student History Modal */}
      {selectedStudentForHistory && (
        <Suspense fallback={<LoadingSpinner />}>
          <StudentLeaveHistory
            student={selectedStudentForHistory}
            onClose={() => setSelectedStudentForHistory(null)}
          />
        </Suspense>
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
