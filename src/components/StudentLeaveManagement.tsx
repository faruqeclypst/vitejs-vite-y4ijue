import React, { useState, useMemo } from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { useAsrama } from '../contexts/AsramaContext';
import { Student, StudentLeave, LeaveType, ReturnStatus } from '../types';
import { Edit, Trash2, X, Calendar, Share, Plus } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import Alert from '../components/Alert';
import useAlert from '../hooks/useAlert';

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
    returnStatus: 'Belum Kembali' // Tambah default value
  });
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<StudentLeave | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAsramaAlert, setShowAsramaAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const { alert, showAlert, hideAlert } = useAlert();
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [selectedLeaveForStatus, setSelectedLeaveForStatus] = useState<StudentLeave | null>(null);
  const [newStatus, setNewStatus] = useState<ReturnStatus | null>(null);

  const leaveTypes: LeaveType[] = ['Sakit', 'Izin', 'Pulang', 'Tanpa Keterangan'];

  // Filter students berdasarkan asrama pengasuh
  const availableStudents = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      return students.filter(student => student.asrama === userAsrama);
    }
    return students;
  }, [students, currentUser, asramas]);

  // Hapus filter perizinan berdasarkan asrama pengasuh
  const filteredLeaves = useMemo(() => {
    return leaves;
  }, [leaves]);

  // Filter perizinan berdasarkan tanggal yang dipilih
  const filteredLeavesByDate = useMemo(() => {
    return filteredLeaves.filter(leave => leave.startDate === selectedDate);
  }, [filteredLeaves, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi nama siswa
    if (!newLeave.studentId) {
      showAlert({
        type: 'error',
        message: 'Silakan pilih nama siswa terlebih dahulu'
      });
      return;
    }

    try {
      if (editingLeave) {
        await updateLeave(editingLeave.id, newLeave);
        showAlert({
          type: 'success',
          message: 'Data perizinan berhasil diperbarui'
        });
      } else {
        await addLeave(newLeave);
        showAlert({
          type: 'success',
          message: 'Data perizinan berhasil ditambahkan'
        });
      }
      resetForm();
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data perizinan'
      });
    }
  };

  const handleDelete = async (id: string) => {
    const leave = leaves.find(l => l.id === id);
    const student = students.find(s => s.id === leave?.studentId);

    // Cek apakah pengasuh memiliki akses untuk menghapus
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      if (student?.asrama !== userAsrama) {
        setAlertMessage('Anda hanya dapat menghapus perizinan siswa dari asrama Anda');
        setShowAsramaAlert(true);
        return;
      }
    }

    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteLeave(deleteId);
        showAlert({
          type: 'success',
          message: 'Data perizinan berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus data perizinan'
        });
      }
    }
    setShowConfirmModal(false);
    setDeleteId(null);
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
      returnStatus: 'Belum Kembali' // Tambah default value
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
        returnStatus: 'Belum Kembali' // Tambah default value
      })
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Validasi ukuran file (maksimal 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showAlert({
            type: 'error',
            message: 'Ukuran file maksimal 5MB'
          });
          return;
        }

        // Validasi tipe file
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          showAlert({
            type: 'error',
            message: 'Tipe file harus berupa JPG, PNG, atau PDF'
          });
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

        showAlert({
          type: 'success',
          message: 'Dokumen berhasil diupload'
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        showAlert({
          type: 'error',
          message: 'Gagal mengupload dokumen. Pastikan ukuran file tidak terlalu besar dan format file sesuai.'
        });
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

  // Modifikasi handleEdit untuk memeriksa akses pengasuh
  const handleEdit = (leave: StudentLeave) => {
    const student = students.find(s => s.id === leave.studentId);
    
    // Cek apakah pengasuh memiliki akses untuk mengedit
    if (currentUser?.role === 'pengasuh' && currentUser?.asramaId) {
      const userAsrama = asramas.find(a => a.id === currentUser.asramaId)?.name;
      if (student?.asrama !== userAsrama) {
        setAlertMessage('Anda hanya dapat mengedit perizinan siswa dari asrama Anda');
        setShowAsramaAlert(true);
        return;
      }
    }

    setEditingLeave(leave);
    setSelectedStudent(student || null);
    setNewLeave({
      ...leave,
      returnStatus: leave.returnStatus || 'Belum Kembali' // Pastikan returnStatus selalu ada
    });
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

  // Tambahkan fungsi untuk menangani perubahan status
  const handleStatusChange = async (leave: StudentLeave, status: ReturnStatus) => {
    // Hanya pengasuh yang bisa mengubah status
    if (currentUser?.role !== 'pengasuh') return;

    setSelectedLeaveForStatus(leave);
    setNewStatus(status);
    setShowStatusConfirmModal(true);
  };

  // Fungsi untuk mengkonfirmasi perubahan status
  const confirmStatusChange = async () => {
    if (!selectedLeaveForStatus || !newStatus) return;

    try {
      const updatedLeave = {
        ...selectedLeaveForStatus,
        returnStatus: newStatus
      };
      await updateLeave(selectedLeaveForStatus.id, updatedLeave);
      showAlert({
        type: 'success',
        message: 'Status berhasil diperbarui'
      });
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal memperbarui status'
      });
    }
    setShowStatusConfirmModal(false);
    setSelectedLeaveForStatus(null);
    setNewStatus(null);
  };

  // Tambahkan fungsi untuk mendapatkan nama file dari URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const fileName = decodedUrl.split('/').pop()?.split('?')[0];
      // Hapus timestamp dari nama file
      return fileName?.replace(/^\d+-/, '') || 'Dokumen';
    } catch {
      return 'Dokumen';
    }
  };

  return (
    <div className="w-full">
      {/* Filter tanggal dan tombol-tombol */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={openModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah Perizinan
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

      {/* Tabel responsif */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <div className="min-w-full lg:min-w-[1000px]">
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 hidden sm:table-cell">No</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3 hidden md:table-cell">Kelas</th>
                <th className="px-4 py-3 hidden md:table-cell">Asrama</th>
                <th className="px-4 py-3">Jenis Izin</th>
                <th className="px-4 py-3 hidden lg:table-cell">Tanggal & Jam Keluar</th>
                <th className="px-4 py-3 hidden lg:table-cell">Tanggal & Jam Kembali</th>
                <th className="px-4 py-3 hidden sm:table-cell">Keterangan</th>
                <th className="px-4 py-3 hidden sm:table-cell">Status Kembali</th>
                <th className="px-4 py-3 hidden sm:table-cell">Bukti</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeavesByDate.map((leave, index) => {
                const student = students.find(s => s.id === leave.studentId);
                return (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 hidden sm:table-cell whitespace-nowrap">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{student?.fullName}</div>
                        <div className="text-sm text-gray-500 md:hidden">
                          {student?.class} - {student?.asrama}
                        </div>
                        <div className="text-sm text-gray-500 lg:hidden mt-1">
                          {leave.startDate} {leave.startTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap">
                      {student?.class}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap">
                      {student?.asrama}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap">
                      {leave.startDate} {leave.startTime}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap">
                      {leave.endDate} {leave.endTime}
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="max-w-xs truncate" title={leave.keterangan}>
                        {leave.keterangan}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell whitespace-nowrap">
                      {currentUser?.role === 'pengasuh' ? (
                        <select
                          value={leave.returnStatus || 'Belum Kembali'}
                          onChange={(e) => handleStatusChange(leave, e.target.value as ReturnStatus)}
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            leave.returnStatus === 'Sudah Kembali'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          <option value="Belum Kembali">Belum Kembali</option>
                          <option value="Sudah Kembali">Sudah Kembali</option>
                        </select>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          leave.returnStatus === 'Sudah Kembali'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {leave.returnStatus || 'Belum Kembali'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell whitespace-nowrap">
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
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex space-x-2 justify-end">
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
      </div>

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden m-2">
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
                    {editingLeave && editingLeave.documentUrl ? (
                      <div className="mb-2 flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          File saat ini: {getFileNameFromUrl(editingLeave.documentUrl)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(editingLeave)}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          Lihat Dokumen
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {editingLeave?.documentUrl 
                        ? "Upload file baru untuk mengganti dokumen yang ada" 
                        : "Upload file (PDF, JPG, PNG)"}
                    </p>
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

      {/* Modal Konfirmasi Delete */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus data perizinan ini?
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

      {/* Alert Modal untuk Asrama */}
      {showAsramaAlert && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Peringatan</h3>
            <p className="text-gray-600 mb-6">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAsramaAlert(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Status */}
      {showStatusConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Konfirmasi Perubahan Status</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin mengubah status menjadi "{newStatus}"?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowStatusConfirmModal(false);
                  setSelectedLeaveForStatus(null);
                  setNewStatus(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tambahkan komponen Alert */}
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

export default StudentLeaveManagement;
