import React, { useState, useMemo } from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { useAsrama } from '../contexts/AsramaContext';
import { Student, StudentLeave, LeaveType } from '../types';
import { Plus, Edit, Trash2, X, Calendar, Share } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const StudentLeaveManagement: React.FC = () => {
  const { leaves, addLeave, updateLeave, deleteLeave } = useStudentLeave();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const { asramas } = useAsrama();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<StudentLeave | null>(null);
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
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<StudentLeave | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Filter perizinan berdasarkan tanggal yang dipilih
  const filteredLeavesByDate = useMemo(() => {
    return filteredLeaves.filter(leave => leave.startDate === selectedDate);
  }, [filteredLeaves, selectedDate]);

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
      studentId: student.id,
      // Reset nilai lainnya jika ini adalah tambah baru (bukan edit)
      ...(editingLeave ? {} : {
        leaveType: 'Izin',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '07:00',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '17:00',
        keterangan: '',
      })
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

  // Ubah fungsi handleViewDocument
  const handleViewDocument = (leave: StudentLeave) => {
    if (leave.documentUrl) {
      const student = students.find(s => s.id === leave.studentId);
      setSelectedDocument(leave.documentUrl);
      setSelectedLeave(leave);
      setSelectedStudent(student || null);
      setIsDocumentModalOpen(true);
    }
  };

  // Ubah fungsi handleEdit
  const handleEdit = (leave: StudentLeave) => {
    const student = students.find(s => s.id === leave.studentId);
    setEditingLeave(leave);
    setSelectedStudent(student || null);
    setNewLeave(leave);
    setIsModalOpen(true);
  };

  // Tambahkan fungsi untuk membuka modal tambah
  const openModal = () => {
    resetForm(); // Reset form terlebih dahulu
    setIsModalOpen(true);
  };

  // Fungsi untuk mengirim pesan WhatsApp
  const shareToWhatsApp = () => {
    const today = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let message = `*Perizinan Siswa - ${today}*\n\n`;
    
    filteredLeavesByDate.forEach((leave, index) => {
      const student = students.find(s => s.id === leave.studentId);
      if (student) {
        message += `${index + 1}. ${student.fullName} (${student.class} - ${student.asrama})\n`;
        message += `   ${leave.leaveType}: ${leave.keterangan}\n\n`;
      }
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="w-full">
      {/* Filter tanggal dan tombol-tombol */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={openModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah Perizinan
          </button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {filteredLeavesByDate.length > 0 && (
          <button
            onClick={shareToWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
          >
            <Share className="h-5 w-5 mr-2" />
            Share WhatsApp
          </button>
        )}
      </div>

      {/* Tampilkan tanggal terpilih */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Perizinan Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h2>
      </div>

      {/* Tabel */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto">
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
            {filteredLeavesByDate.map((leave, index) => {
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
                        onClick={() => handleViewDocument(leave)}
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
                        onClick={() => handleEdit(leave)}
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
            {filteredLeavesByDate.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada perizinan untuk tanggal ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal dengan ukuran lebih besar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden">
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
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Bagian Atas: Nama Siswa dan Jenis Izin */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Nama Siswa
                    </label>
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={(e) => {
                        const student = availableStudents.find(s => s.id === e.target.value);
                        if (student) {
                          handleStudentSelect(student);
                        }
                      }}
                      disabled={Boolean(editingLeave)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih Siswa</option>
                      {availableStudents
                        .sort((a, b) => a.fullName.localeCompare(b.fullName))
                        .map(student => (
                          <option key={student.id} value={student.id}>
                            {student.fullName} - {student.class} - {student.asrama}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Jenis Izin
                    </label>
                    <select
                      value={newLeave.leaveType}
                      onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value as LeaveType })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {leaveTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bagian Tengah: Waktu Izin */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Waktu Izin
                  </label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Mulai</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={newLeave.startDate}
                            onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={newLeave.startTime}
                            onChange={(e) => setNewLeave({ ...newLeave, startTime: e.target.value })}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Selesai</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={newLeave.endDate}
                            onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={newLeave.endTime}
                            onChange={(e) => setNewLeave({ ...newLeave, endTime: e.target.value })}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bagian Bawah: Keterangan dan Upload */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Keterangan
                    </label>
                    <textarea
                      value={newLeave.keterangan}
                      onChange={(e) => setNewLeave({ ...newLeave, keterangan: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Tambahkan keterangan..."
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Bukti Surat/Dokumen
                    </label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
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
                    {editingLeave ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDocumentModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Dokumen Perizinan</h3>
                  {selectedLeave && selectedStudent && (
                    <div className="mt-1 text-sm text-gray-600">
                      <p>Siswa: {selectedStudent.fullName}</p>
                      <p>Asrama: {selectedStudent.asrama}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsDocumentModalOpen(false);
                    setSelectedDocument(null);
                    setSelectedLeave(null);
                    setSelectedStudent(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-4 h-[80vh]">
              <iframe
                src={selectedDocument}
                className="w-full h-full rounded-lg"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLeaveManagement;
