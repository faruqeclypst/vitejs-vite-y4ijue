import React, { useState, useMemo } from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { useAsrama } from '../contexts/AsramaContext';
import { Student, StudentLeave, LeaveType } from '../types';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase'; // Pastikan storage sudah diexport dari firebase.ts

const StudentLeaveManagement: React.FC = () => {
  const { leaves, addLeave, updateLeave, deleteLeave } = useStudentLeave();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const { asramas } = useAsrama();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<StudentLeave | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newLeave, setNewLeave] = useState<Omit<StudentLeave, 'id'>>({
    studentId: '',
    leaveType: 'Izin',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '17:00',
    keterangan: '',
  });

  const leaveTypes: LeaveType[] = ['Sakit', 'Izin', 'Pulang', 'Tanpa Keterangan'];

  // Filter students berdasarkan asrama pengasuh
  const availableStudents = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      return students.filter(student => student.asrama === userAsrama);
    }
    return students;
  }, [students, currentUser, asramas]);

  // Filter perizinan berdasarkan asrama pengasuh
  const filteredLeaves = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      return leaves.filter(leave => {
        const student = students.find(s => s.id === leave.studentId);
        return student?.asrama === userAsrama;
      });
    }
    return leaves;
  }, [leaves, students, currentUser, asramas]);

  // Update pencarian siswa untuk menggunakan availableStudents
  const filteredStudents = availableStudents.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLeave) {
      await updateLeave(editingLeave.id, newLeave);
    } else {
      await addLeave(newLeave);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      await deleteLeave(id);
    }
  };

  const resetForm = () => {
    setEditingLeave(null);
    setSelectedStudent(null);
    setNewLeave({
      studentId: '',
      leaveType: 'Izin',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '07:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '17:00',
      keterangan: '',
    });
    setIsModalOpen(false);
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setNewLeave(prev => ({
      ...prev,
      studentId: student.id
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Validasi ukuran file (maksimal 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Ukuran file maksimal 5MB');
          return;
        }

        // Validasi tipe file
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          alert('Tipe file harus berupa JPG, PNG, atau PDF');
          return;
        }

        // Generate nama file yang unik
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fileRef = storageRef(storage, `leave-documents/${fileName}`);
        
        // Upload file
        await uploadBytes(fileRef, file);
        
        // Dapatkan URL download
        const downloadURL = await getDownloadURL(fileRef);
        
        // Update state dengan URL dokumen
        setNewLeave(prev => ({
          ...prev,
          documentUrl: downloadURL
        }));

        alert('Dokumen berhasil diupload');
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Gagal mengupload dokumen. Pastikan ukuran file tidak terlalu besar dan format file sesuai.');
      }
    }
  };

  // Tambahkan fungsi untuk menangani preview dokumen
  const handleViewDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      {/* Tombol Tambah */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Perizinan
        </button>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingLeave ? 'Edit Perizinan' : 'Tambah Perizinan'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student Search */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Siswa
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari siswa..."
                      className="w-full p-2 border rounded pr-10"
                    />
                    <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  {searchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => handleStudentSelect(student)}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {student.fullName} - {student.class}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kelas
                      </label>
                      <input
                        type="text"
                        value={selectedStudent.class}
                        disabled
                        className="w-full p-2 border rounded bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asrama
                      </label>
                      <input
                        type="text"
                        value={selectedStudent.asrama}
                        disabled
                        className="w-full p-2 border rounded bg-gray-100"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jenis Izin
                  </label>
                  <select
                    value={newLeave.leaveType}
                    onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value as LeaveType })}
                    className="w-full p-2 border rounded"
                  >
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Keluar
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                      <input
                        type="time"
                        value={newLeave.startTime}
                        onChange={(e) => setNewLeave({ ...newLeave, startTime: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Kembali
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                      <input
                        type="time"
                        value={newLeave.endTime}
                        onChange={(e) => setNewLeave({ ...newLeave, endTime: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    value={newLeave.keterangan}
                    onChange={(e) => setNewLeave({ ...newLeave, keterangan: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows={3}
                    placeholder="Tambahkan keterangan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bukti Surat/Dokumen
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full p-2 border rounded"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
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
                    {editingLeave ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Table dengan scroll horizontal */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <div className="min-w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama Siswa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Kelas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Asrama</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Jenis Izin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal & Jam Keluar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal & Jam Kembali</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Keterangan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Bukti</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeaves.map((leave, index) => {
                const student = students.find(s => s.id === leave.studentId);
                return (
                  <tr key={leave.id}>
                    <td className="px-4 py-4 whitespace-nowrap">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{student?.fullName}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{student?.class}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{student?.asrama}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{leave.leaveType}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {leave.startDate} {leave.startTime}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {leave.endDate} {leave.endTime}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap max-w-xs truncate" title={leave.keterangan}>
                      {leave.keterangan}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {leave.documentUrl ? (
                        <button
                          onClick={() => handleViewDocument(leave.documentUrl!)}
                          className="text-blue-600 hover:text-blue-900 underline"
                        >
                          Lihat Dokumen
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingLeave(leave);
                            setSelectedStudent(student || null);
                            setNewLeave(leave);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(leave.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLeaveManagement;
