import React, { useState, useMemo, useEffect } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useBarak } from '../contexts/BarakContext'; // Ganti useAsrama dengan useBarak
import Papa from 'papaparse';
import { Edit, Trash2, Plus, X, FileText, History } from 'lucide-react';
import StudentLeaveHistory from './StudentLeaveHistory';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import useAlert from '../hooks/useAlert';
import { ref, onValue, get } from 'firebase/database'; // Hapus 'get' karena tidak digunakan
import { db } from '../firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import { exportStudent } from '../utils/exportStudent';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [groupedStudents, setGroupedStudents] = useState<Record<string, Student[]>>({ 'Semua Siswa': students });
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const { isOpen: isConfirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirmation();

  // Tambahkan useEffect untuk memantau perubahan user dan barakId
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, async () => {
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.id}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        if (userData) {
          // Filter students berdasarkan tab yang aktif
          const filteredStudents = activeTab === 'active' 
            ? students.filter((student: Student) => !student.isDeleted)
            : allStudents.filter((student: Student) => student.isDeleted);

          if (userData.role === 'admin_asrama') {
            // Admin asrama melihat semua barak
            const groupedByBarak = filteredStudents.reduce((acc: Record<string, Student[]>, student: Student) => {
              if (!acc[student.barak]) {
                acc[student.barak] = [];
              }
              acc[student.barak].push(student);
              return acc;
            }, {} as Record<string, Student[]>);
            setGroupedStudents(groupedByBarak);
          } else if (userData.role === 'pengasuh' && userData.barakId) {
            // Pengasuh melihat barak yang dia kelola
            const barakIds = userData.barakId.split(',');
            
            // Buat object untuk menyimpan siswa per barak
            const groupedStudents: Record<string, Student[]> = {};
            
            // Untuk setiap barak yang dikelola pengasuh
            barakIds.forEach((barakId: string) => {
              const barak = baraks.find(b => b.id === barakId);
              if (barak) {
                // Filter siswa untuk barak ini
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

    return () => unsubscribe();
  }, [currentUser?.id, students, allStudents, baraks, activeTab]);

  // Filter asrama yang bisa dipilih saat menambah/edit siswa
  const availableBaraks = useMemo(() => {
    if (currentUser?.role === 'pengasuh') {
      // Ambil data user terbaru dari database setiap kali memo dijalankan
      const userRef = ref(db, `users/${currentUser.id}`);
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.barakId) {
          const barakIds = userData.barakId.split(',');
          return baraks.filter(barak => barakIds.includes(barak.id));
        }
      });
    }
    return baraks;
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

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pastikan barak sama dengan asrama untuk backward compatibility
      const studentData = {
        ...newStudent,
        barak: newStudent.barak
      };

      if (editingStudent) {
        await updateStudent(editingStudent.id, studentData);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil diperbarui'
        });
      } else {
        await addStudent(studentData);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil ditambahkan'
        });
      }
      setNewStudent({
        fullName: '',
        gender: 'Laki-laki',
        class: availableClasses[0],
        barak: ''
      });
      setIsModalOpen(false);
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data siswa'
      });
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteStudent(deleteId);
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
    setShowConfirmModal(false);
    setDeleteId(null);
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
    
    if (currentUser.role === 'admin_asrama') {
      return true; // Admin asrama punya akses ke semua barak
    }
    
    if (currentUser.role === 'pengasuh' && currentUser.barakId) {
      const userBarakIds = currentUser.barakId.split(',');
      // Cari barak berdasarkan nama dan cek apakah pengasuh punya akses
      const barak = baraks.find((b: { id: string; name: string }) => b.name === barakName);
      return barak ? userBarakIds.includes(barak.id) : false;
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
        await deleteStudentPermanently(id);
        showAlert({
          type: 'success',
          message: 'Siswa berhasil dihapus secara permanen'
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
      // Tampilkan 10 baris kosong jika tidak ada data
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">No</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Kelas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barak</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Jenis Kelamin</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(10)].map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">-</td>
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Kelas</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barak</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Jenis Kelamin</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => (
              <tr key={student.id} className="group hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.class}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.barak}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    student.gender === 'Laki-laki' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-pink-100 text-pink-800'
                  }`}>
                    {student.gender}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white group-hover:bg-gray-50 transition-colors">
                  <div className="flex justify-end space-x-3">
                    {activeTab === 'active' && canEditBarak ? (
                      <>
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    ) : activeTab === 'deleted' ? (
                      <>
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Pulihkan"
                        >
                          <History className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(student.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500 italic">
                        Tidak ada akses
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedStudentForHistory(student)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors"
                      title="Lihat Riwayat Perizinan"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Tambahkan baris kosong jika data kurang dari 10 */}
            {[...Array(emptyRows)].map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{students.length + index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Tombol tambah dan import/export */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <button
            onClick={openModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah Siswa
          </button>
          <label className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center text-base cursor-pointer">
            <Plus className="h-5 w-5 mr-2" />
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button 
            onClick={handleExportCSV}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
          >
            <Plus className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tambah tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Siswa Aktif
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`${
              activeTab === 'deleted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Siswa Terhapus
          </button>
        </nav>
      </div>

      {/* Render tables with dynamic columns */}
      <div className={`grid grid-cols-1 ${Object.keys(groupedStudents).length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
        {Object.keys(groupedStudents).length > 0 ? (
          Object.entries(groupedStudents).map(([barakName, students]) => (
            <div key={barakName} className={`bg-white shadow-md rounded-lg overflow-hidden h-fit ${
              Object.keys(groupedStudents).length === 1 ? 'lg:col-span-1' : ''
            }`}>
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">{barakName}</h3>
              </div>
              {renderStudentTable(students, barakName)}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">Tidak ada data siswa yang tersedia</p>
          </div>
        )}
      </div>

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateStudent} className="p-6 space-y-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tingkat
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['X', 'XI', 'XII'].map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setSelectedGrade(grade as 'X' | 'XI' | 'XII')}
                      className={`p-3 rounded-lg transition-colors ${
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

              {selectedGrade && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kelas
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNewStudent({ ...newStudent, class: `${selectedGrade}-${num}` })}
                        className={`p-3 rounded-lg transition-colors ${
                          newStudent.class === `${selectedGrade}-${num}`
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {`${selectedGrade}-${num}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barak
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableBaraks.map((barak) => (
                    <button
                      key={barak.id}
                      type="button"
                      onClick={() => handleBarakSelect(barak.name)}
                      className={`p-3 rounded-lg transition-colors ${
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

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  {editingStudent ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal riwayat perizinan */}
      {selectedStudentForHistory && (
        <StudentLeaveHistory
          student={selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}

      {/* Modal konfirmasi delete */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus data siswa ini?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert component */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}

      {/* Tambahkan ConfirmationModal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmOptions?.title || ''}
        message={confirmOptions?.message || ''}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
      />
    </div>
  );
};

export default StudentManagement;
