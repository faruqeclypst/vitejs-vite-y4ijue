import React, { useState, useMemo } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useAsrama } from '../contexts/AsramaContext';
import Papa from 'papaparse';
import { Edit, Trash2, Plus, X, FileText } from 'lucide-react';
import StudentLeaveHistory from './StudentLeaveHistory';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import useAlert from '../hooks/useAlert';

const StudentManagement: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent } = useStudents();
  const { asramas } = useAsrama();
  const { user: currentUser } = useAuth();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    fullName: '',
    gender: 'Laki-laki',
    class: availableClasses[0],
    asrama: ''
  });
  const [selectedGrade, setSelectedGrade] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modifikasi filteredStudents untuk admin_asrama
  const groupedStudents = useMemo(() => {
    if (currentUser?.role === 'admin_asrama') {
      return students.reduce((acc, student) => {
        if (!acc[student.asrama]) {
          acc[student.asrama] = [];
        }
        acc[student.asrama].push(student);
        return acc;
      }, {} as Record<string, Student[]>);
    } else if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      const filtered = students.filter(student => student.asrama === userAsrama);
      return { [userAsrama || '']: filtered };
    }
    return { 'Semua Siswa': students };
  }, [students, currentUser, asramas]);

  // Filter asrama yang bisa dipilih saat menambah/edit siswa
  const availableAsramas = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      return asramas.filter(asrama => asrama.id === currentUser.asramaId);
    }
    return asramas;
  }, [asramas, currentUser]);

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, newStudent);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil diperbarui'
        });
      } else {
        await addStudent(newStudent);
        showAlert({
          type: 'success',
          message: 'Data siswa berhasil ditambahkan'
        });
      }
      setNewStudent({ fullName: '', gender: 'Laki-laki', class: availableClasses[0], asrama: '' });
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
            asrama: row[3]
          }));
          importedStudents.forEach(student => {
            if (student.fullName && (student.gender === 'Laki-laki' || student.gender === 'Perempuan') && student.class && student.asrama) {
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

  const handleExportCSV = () => {
    const exportData = students.map(student => ({
      ...student,
      gender: student.gender === 'Laki-laki' ? 'Male' : 'Female'
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'students.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openModal = () => {
    setEditingStudent(null);
    setNewStudent({ fullName: '', gender: 'Laki-laki', class: availableClasses[0], asrama: '' });
    setIsModalOpen(true);
  };

  const renderStudentTable = (students: Student[], title?: string) => (
    <div className="overflow-hidden bg-white shadow-md rounded-lg h-full">
      {title && (
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className={`${students.length > 10 ? 'max-h-[600px] overflow-y-auto' : ''}`}>
          <table className="w-full table-auto">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">No</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Kelas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asrama</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.asrama}</td>
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
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">
                    Tidak ada data siswa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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

      {/* Render tabel berdasarkan role */}
      {currentUser?.role === 'admin_asrama' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(groupedStudents)
            .sort(([asramaA], [asramaB]) => asramaA.localeCompare(asramaB))
            .map(([asrama, students]) => (
              <div key={asrama}>
                {renderStudentTable(students, asrama || 'Belum Ada Asrama')}
              </div>
            ))}
        </div>
      ) : (
        renderStudentTable(Object.values(groupedStudents)[0])
      )}

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <form onSubmit={handleAddOrUpdateStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newStudent.fullName}
                    onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                    placeholder="Nama Lengkap"
                    required
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Laki-laki', 'Perempuan'].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setNewStudent({ ...newStudent, gender: gender as 'Laki-laki' | 'Perempuan' })}
                        className={`p-2 rounded-md transition-colors ${
                          newStudent.gender === gender
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tingkatan</label>
                  <div className="flex space-x-2">
                    {['X', 'XI', 'XII'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedGrade(g as 'X' | 'XI' | 'XII')}
                        className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                          selectedGrade === g 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedGrade && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kelas</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNewStudent({ ...newStudent, class: `${selectedGrade}-${num}` })}
                          className={`p-2 rounded-md transition-colors ${
                            newStudent.class === `${selectedGrade}-${num}`
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {`${selectedGrade}-${num}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asrama</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableAsramas.map((asrama) => (
                      <button
                        key={asrama.id}
                        type="button"
                        onClick={() => setNewStudent({ ...newStudent, asrama: asrama.name })}
                        className={`p-2 rounded-md transition-colors ${
                          newStudent.asrama === asrama.name
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {asrama.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {editingStudent ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
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
    </div>
  );
};

export default StudentManagement;
