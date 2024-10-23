import React, { useState, useMemo, useEffect } from 'react';
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
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [newLeave, setNewLeave] = useState<Omit<StudentLeave, 'id' | 'studentId'>>({
    leaveType: 'Izin',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '17:00',
    keterangan: '',
    returnStatus: 'Belum Kembali'
  });
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<StudentLeave | null>(null);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [selectedLeaveForStatus, setSelectedLeaveForStatus] = useState<StudentLeave | null>(null);
  const [newStatus, setNewStatus] = useState<ReturnStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertMessage] = useState('');
  const [showAsramaAlert, setShowAsramaAlert] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();

  const leaveTypes: LeaveType[] = ['Sakit', 'Izin', 'Pulang', 'Tanpa Keterangan', 'Lomba'];

  // Filter students berdasarkan asrama pengasuh
  const availableStudents = useMemo(() => {
    if (currentUser?.role === 'pengasuh' && currentUser?.barakId) {
      const userBarakIds = currentUser.barakId.split(',');
      const userBaraks = asramas
        .filter(a => userBarakIds.includes(a.id))
        .map(a => a.name);
      
      return students.filter(student => 
        userBaraks.includes(student.barak)
      );
    }
    return students;
  }, [students, currentUser, asramas]);

  // Filter siswa berdasarkan pencarian
  const filteredStudents = useMemo(() => {
    return availableStudents.filter(student => 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.barak.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableStudents, searchTerm]);

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
    try {
      if (editingLeave) {
        // Untuk edit tetap single student
        await updateLeave(editingLeave.id, {
          ...newLeave,
          studentId: selectedStudents[0].id
        });
        showAlert({
          type: 'success',
          message: 'Data perizinan berhasil diperbarui'
        });
      } else {
        // Untuk tambah baru, buat perizinan untuk setiap siswa yang dipilih
        const promises = selectedStudents.map(student =>
          addLeave({
            ...newLeave,
            studentId: student.id
          })
        );
        await Promise.all(promises);
        showAlert({
          type: 'success',
          message: `Berhasil menambahkan perizinan untuk ${selectedStudents.length} siswa`
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

  const handleDelete = (leaveId: string) => {
    setDeleteId(leaveId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteLeave(deleteId);
        showAlert({
          type: 'success',
          message: 'Perizinan berhasil dihapus',
          duration: 3000
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus perizinan',
          duration: 3000
        });
      }
    }
    setShowDeleteConfirmModal(false);
    setDeleteId(null);
  };

  const resetForm = () => {
    setEditingLeave(null);
    setSelectedStudents([]);
    setNewLeave({
      leaveType: 'Izin',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '07:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '17:00',
      keterangan: '',
      returnStatus: 'Belum Kembali'
    });
    setIsModalOpen(false);
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
      setSelectedStudents(student ? [student] : []);
      setIsDocumentModalOpen(true);
    }
  };

  // Update handleEdit
  const handleEdit = (leave: StudentLeave) => {
    const student = students.find(s => s.id === leave.studentId);
    if (!student) return;

    // Debug info
    console.log('Edit Debug:');
    console.log('Current User:', currentUser);
    console.log('Student:', student);
    console.log('Student Barak:', student.barak);
    console.log('User Barak IDs:', currentUser?.barakId);

    // Cek akses menggunakan hasAccessToBarak
    const canAccess = hasAccessToBarak(student.barak);
    console.log('Has Access:', canAccess);

    if (!canAccess) {
      showAlert({
        type: 'error',
        message: 'Anda hanya dapat mengedit perizinan siswa dari barak Anda'
      });
      return;
    }

    // Set state untuk mode edit
    setEditingLeave(leave);
    setSelectedStudents([student]); // Set siswa yang sedang diedit
    setSearchTerm(student.fullName); // Set nama siswa di input pencarian
    setNewLeave({
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      startTime: leave.startTime,
      endDate: leave.endDate,
      endTime: leave.endTime,
      keterangan: leave.keterangan,
      returnStatus: leave.returnStatus || 'Belum Kembali',
      documentUrl: leave.documentUrl
    });
    setIsModalOpen(true);
  };

  // Tambahkan fungsi untuk membuka modal tambah
  const openModal = () => {
    resetForm(); // Reset form terlebih dahulu
    setIsModalOpen(true); // Kemudian buka modal
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
        message += `${index + 1}. ${student.fullName} (${student.class} - ${student.barak})\n`;
        message += `   ${leave.leaveType}: ${leave.keterangan}\n\n`;
      }
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  // Update fungsi hasAccessToBarak
  const hasAccessToBarak = (studentBarak: string) => {
    if (!currentUser) return false;
    
    if (currentUser.role === 'admin_asrama') {
      return true; // Admin asrama punya akses ke semua barak
    }
    
    if (currentUser.role === 'pengasuh' && currentUser.barakId) {
      const userBarakIds = currentUser.barakId.split(',');
      const userBaraks = asramas
        .filter(b => userBarakIds.includes(b.id))
        .map(b => b.name);
      
      // Debug info
      console.log('Debug Info:');
      console.log('Current User:', currentUser);
      console.log('User Barak IDs:', userBarakIds);
      console.log('User Baraks:', userBaraks);
      console.log('Student Barak:', studentBarak);
      console.log('Has Access:', userBaraks.includes(studentBarak));
      
      // Cek apakah nama barak siswa ada dalam daftar barak yang dikelola pengasuh
      return userBaraks.includes(studentBarak);
    }
    
    return false;
  };

  // Update handleStatusChange untuk menampilkan pesan yang lebih jelas
  const handleStatusChange = async (leave: StudentLeave, status: ReturnStatus) => {
    const student = students.find(s => s.id === leave.studentId);
    if (!student) return;

    // Debug info
    console.log('Status Change Debug:');
    console.log('Current User:', currentUser);
    console.log('Student:', student);
    console.log('Student Barak:', student.barak);
    console.log('User Barak IDs:', currentUser?.barakId);

    // Cek akses berdasarkan barak
    const canAccess = hasAccessToBarak(student.barak);
    console.log('Has Access:', canAccess);

    if (!canAccess) {
      showAlert({
        type: 'error',
        message: `Anda tidak memiliki akses ke barak ${student.barak}`
      });
      return;
    }

    try {
      const updatedLeave = {
        ...leave,
        returnStatus: status
      };
      await updateLeave(leave.id, updatedLeave);
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

  // Tambahkan event listener untuk menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.relative')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Pastikan useAlert digunakan
  useEffect(() => {
    if (alert) {
      // Optional: Tambahkan logika tambahan saat alert berubah
    }
  }, [alert]);

  return (
    <div className="space-y-6">
      {/* Header dan Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center text-base"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah Perizinan
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center text-base"
          >
            <Share className="h-5 w-5 mr-2" />
            Share WhatsApp
          </button>
        )}
      </div>

      {/* Tabel Responsif */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barak</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Izin</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Jam Keluar</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Jam Kembali</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bukti</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeavesByDate.map((leave, index) => {
                  const student = students.find(s => s.id === leave.studentId);
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{student?.fullName}</div>
                          <div className="md:hidden text-sm text-gray-500">
                            {student?.class} - {student?.barak}
                          </div>
                          <div className="lg:hidden text-sm text-gray-500 mt-1">
                            {leave.startDate} {leave.startTime}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm">{student?.class}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm">{student?.barak}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm whitespace-nowrap">
                        {leave.startDate} {leave.startTime}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm whitespace-nowrap">
                        {leave.endDate} {leave.endTime}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm">
                        <div className="max-w-xs truncate" title={leave.keterangan}>
                          {leave.keterangan}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(currentUser?.role === 'pengasuh' || currentUser?.role === 'admin_asrama') && (
                          <>
                            {student && hasAccessToBarak(student.barak) ? (
                              <select
                                value={leave.returnStatus || 'Belum Kembali'}
                                onChange={(e) => handleStatusChange(leave, e.target.value as ReturnStatus)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${
                                  leave.returnStatus === 'Sudah Kembali'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                <option value="Belum Kembali">Belum Kembali</option>
                                <option value="Sudah Kembali">Sudah Kembali</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg ${
                                leave.returnStatus === 'Sudah Kembali'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {leave.returnStatus || 'Belum Kembali'}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        {leave.documentUrl ? (
                          <button
                            onClick={() => handleViewDocument(leave)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                          >
                            <svg 
                              className="w-4 h-4 mr-1.5" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                              />
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                              />
                            </svg>
                            Dokumen
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-2">
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
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile View untuk Data */}
      <div className="md:hidden space-y-4">
        {filteredLeavesByDate.map((leave) => { // Hapus parameter index yang tidak digunakan
          const student = students.find(s => s.id === leave.studentId);
          return (
            <div key={leave.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-900">{student?.fullName}</div>
                  <div className="text-sm text-gray-500">
                    {student?.class} - {student?.barak}
                  </div>
                </div>
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
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Jenis Izin:</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                    {leave.leaveType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tanggal & Jam Keluar:</span>
                  <span className="text-sm">{leave.startDate} {leave.startTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tanggal & Jam Kembali:</span>
                  <span className="text-sm">{leave.endDate} {leave.endTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  {(currentUser?.role === 'pengasuh' || currentUser?.role === 'admin_asrama') && (
                    <>
                      {student && hasAccessToBarak(student.barak) ? (
                        <select
                          value={leave.returnStatus || 'Belum Kembali'}
                          onChange={(e) => handleStatusChange(leave, e.target.value as ReturnStatus)}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            leave.returnStatus === 'Sudah Kembali'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          <option value="Belum Kembali">Belum Kembali</option>
                          <option value="Sudah Kembali">Sudah Kembali</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg ${
                          leave.returnStatus === 'Sudah Kembali'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {leave.returnStatus || 'Belum Kembali'}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {leave.documentUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Dokumen:</span>
                    <button
                      onClick={() => handleViewDocument(leave)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      Dokumen
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingLeave ? 'Edit Perizinan' : 'Tambah Perizinan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dropdown Siswa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingLeave ? 'Siswa' : 'Pilih Siswa'} {selectedStudents.length > 0 && `(${selectedStudents.length} dipilih)`}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari siswa..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!editingLeave) setIsDropdownOpen(true);
                      }}
                      onClick={() => !editingLeave && setIsDropdownOpen(true)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        editingLeave ? 'bg-gray-100' : ''
                      }`}
                      readOnly={!!editingLeave} // Readonly jika dalam mode edit
                    />
                    {/* Tampilkan siswa yang sudah dipilih */}
                    {selectedStudents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedStudents.map((student) => (
                          <div
                            key={student.id}
                            className="inline-flex items-center bg-blue-100 text-blue-700 rounded-full px-3 py-1"
                          >
                            <span className="text-sm">{student.fullName}</span>
                            {!editingLeave && ( // Hanya tampilkan tombol hapus jika bukan mode edit
                              <button
                                type="button"
                                onClick={() => setSelectedStudents(prev => prev.filter(s => s.id !== student.id))}
                                className="ml-2 text-blue-500 hover:text-blue-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Dropdown hanya muncul jika bukan mode edit */}
                    {!editingLeave && isDropdownOpen && filteredStudents.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredStudents
                          .filter(student => !selectedStudents.some(s => s.id === student.id))
                          .map((student) => (
                            <div
                              key={student.id}
                              onClick={() => {
                                setSelectedStudents(prev => [...prev, student]);
                                setSearchTerm('');
                              }}
                              className="p-3 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="font-medium">{student.fullName}</div>
                              <div className="text-sm text-gray-500">
                                {student.class} - {student.barak}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
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
                          Dokumen
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
                  {selectedLeave && selectedStudents && (
                    <div className="mt-1 text-sm text-gray-600">
                      <p>Siswa: {selectedStudents.map(s => s.fullName).join(', ')}</p>
                      <p>Barak: {selectedStudents.map(s => s.barak).join(', ')}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsDocumentModalOpen(false);
                    setSelectedDocument(null);
                    setSelectedLeave(null);
                    setSelectedStudents([]);
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
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus perizinan ini?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteId(null);
                }}
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
