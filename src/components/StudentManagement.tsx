import React, { useState, useMemo } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useAsrama } from '../contexts/AsramaContext';
import Papa from 'papaparse';
import { ChevronDown, ChevronUp, Edit, Trash2, Plus, X, FileText } from 'lucide-react';
import StudentLeaveHistory from './StudentLeaveHistory';
import { useAuth } from '../contexts/AuthContext';

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
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // Filter students berdasarkan asrama pengasuh
  const filteredStudents = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      return students.filter(student => student.asrama === userAsrama);
    }
    return students;
  }, [students, currentUser, asramas]);

  // Ubah groupedStudents untuk menggunakan filteredStudents
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    if (!acc[student.asrama]) {
      acc[student.asrama] = [];
    }
    acc[student.asrama].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Filter asrama yang bisa dipilih saat menambah/edit siswa
  const availableAsramas = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      return asramas.filter(asrama => asrama.id === currentUser.asramaId);
    }
    return asramas;
  }, [asramas, currentUser]);

  const handleAddOrUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudent(editingStudent.id, newStudent);
      setEditingStudent(null);
    } else {
      addStudent(newStudent);
    }
    setNewStudent({ fullName: '', gender: 'Laki-laki', class: availableClasses[0], asrama: '' });
    setIsModalOpen(false);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus siswa ini?')) {
      deleteStudent(id);
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
            asrama: row[3]
          }));
          importedStudents.forEach(student => {
            if (student.fullName && (student.gender === 'Laki-laki' || student.gender === 'Perempuan') && student.class && student.asrama) {
              addStudent(student as Omit<Student, 'id'>);
            }
          });
          alert('Siswa berhasil diimpor!');
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

  const toggleClass = (className: string) => {
    setExpandedClasses(prev =>
      prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]
    );
  };

  const openModal = () => {
    setEditingStudent(null);
    setNewStudent({ fullName: '', gender: 'Laki-laki', class: availableClasses[0], asrama: '' });
    setIsModalOpen(true);
  };

  // Render tabel khusus untuk pengasuh
  const renderPengasuhTable = () => {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Kelamin</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student, index) => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.class}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.gender}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditStudent(student)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="text-red-600 hover:text-red-900 p-1 ml-2"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedStudentForHistory(student)}
                    className="text-indigo-600 hover:text-indigo-900 p-1 ml-2"
                    title="Lihat Riwayat Perizinan"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={openModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah Siswa
          </button>
          <label className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          <button onClick={handleExportCSV} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg">
            Export CSV
          </button>
        </div>
      </div>

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

      {/* Render tabel berdasarkan role */}
      {currentUser?.role === 'pengasuh' ? (
        renderPengasuhTable()
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedStudents).map(([asramaName, asramaStudents]) => (
            <div key={asramaName} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleClass(asramaName)}
                className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200"
              >
                <h3 className="font-bold text-lg">{asramaName || 'Belum Ada Asrama'}</h3>
                {expandedClasses.includes(asramaName) ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
              {expandedClasses.includes(asramaName) && (
                <div className="p-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Kelamin</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {asramaStudents.map((student, index) => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{student.fullName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{student.class}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{student.gender}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleEditStudent(student)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="text-red-600 hover:text-red-900 p-1 ml-2"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setSelectedStudentForHistory(student)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 ml-2"
                              title="Lihat Riwayat Perizinan"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Riwayat Perizinan */}
      {selectedStudentForHistory && (
        <StudentLeaveHistory
          student={selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}
    </div>
  );
};

export default StudentManagement;
