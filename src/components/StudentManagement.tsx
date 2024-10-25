import React, { useState, useMemo, useEffect } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useBarak } from '../contexts/BarakContext'; // Ganti useAsrama dengan useBarak
import Papa from 'papaparse';
import { Edit, Trash2, Plus, X, FileText, History, Search, Users } from 'lucide-react';
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

  const handleDelete = async (id: string) => {
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
                          onClick={() => handleEditStudent(student)}
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Tambah Siswa</span>
          </button>
          <label className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
            <Plus size={18} />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button 
            onClick={handleExportCSV}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="min-h-screen px-4 text-center">
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddOrUpdateStudent} className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Nama Lengkap, Tingkat, dan Kelas */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    {/* Nama Lengkap */}
                    <div className="mb-4">
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

                    {/* Tingkat */}
                    <div className="mb-4">
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

                    {/* Kelas */}
                    {selectedGrade && (
                      <div>
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
                  </div>

                  {/* Barak */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barak
                    </label>
                    <div className="max-h-[400px] overflow-y-auto pr-2"> {/* Tambahkan max height dan scroll */}
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
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
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
        </div>
      )}

      {/* Student History Modal */}
      {selectedStudentForHistory && (
        <StudentLeaveHistory
          student={selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}
    </>
  );
};

export default StudentManagement;
