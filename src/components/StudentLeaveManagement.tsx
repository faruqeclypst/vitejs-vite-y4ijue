import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { useBarak } from '../contexts/BarakContext';
import { Student, StudentLeave, LeaveType, ReturnStatus, Barak } from '../types';
import { X, Calendar, Share, Plus, Settings } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import Alert from '../components/Alert';
import useAlert from '../hooks/useAlert';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

const StudentLeaveManagement: React.FC = () => {
  const { leaves, addLeave, updateLeave, deleteLeave } = useStudentLeave();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const { baraks } = useBarak();
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
  const [filteredLeavesByDate, setFilteredLeavesByDate] = useState<StudentLeave[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const leaveTypes: LeaveType[] = ['Sakit', 'Izin', 'Pulang', 'Tanpa Keterangan', 'Lomba'];

  // Tambahkan useRef untuk dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter students berdasarkan asrama pengasuh
  const filterStudentsByUserAccess = (students: Student[]) => {
    if (currentUser && currentUser.barakId) {
      const userBarakIds = currentUser.barakId.split(',');
      const userBaraks = baraks
        .filter((barak: Barak) => userBarakIds.includes(barak.id))
        .map((barak: Barak) => barak.name);
      
      return students.filter(student => 
        userBaraks.includes(student.barak)
      );
    }
    return students;
  };

  // Filter siswa berdasarkan pencarian
  const filteredStudents = useMemo(() => {
    return filterStudentsByUserAccess(students).filter(student => 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.barak.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm, filterStudentsByUserAccess]);

  // Hapus filter perizinan berdasarkan asrama pengasuh
  const filteredLeaves = useMemo(() => {
    return leaves;
  }, [leaves]);
  // Filter perizinan berdasarkan tanggal yang dipilih
  useEffect(() => {
    const filtered = filteredLeaves.filter(leave => leave.startDate === selectedDate);
    setFilteredLeavesByDate(filtered);
  }, [filteredLeaves, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi siswa sudah dipilih
    if (selectedStudents.length === 0) {
      showAlert({
        type: 'error',
        message: 'Pilih minimal satu siswa terlebih dahulu'
      });
      return;
    }

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
        message += `   ${leave.leaveType}\n`;
        message += `   Waktu: ${leave.startDate} ${leave.startTime} s/d ${leave.endDate} ${leave.endTime}\n`;
        message += `   Keterangan: ${leave.keterangan || '-'}\n`;
        message += `   Status: ${leave.returnStatus || 'Belum Kembali'}\n\n`;
      }
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  // Update fungsi hasAccessToBarak
  const hasAccessToBarak = (barakName: string) => {
    if (!currentUser) return false;
    
    // Admin master punya akses ke semua barak
    if (currentUser.role === 'admin_master') {
      return true;
    }
    
    // Admin asrama juga punya akses ke semua barak
    if (currentUser.role === 'admin_asrama') {
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

  // Update useEffect untuk click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Pastikan useAlert digunakan
  useEffect(() => {
    if (alert) {
      // Optional: Tambahkan logika tambahan saat alert berubah
    }
  }, [alert]);

  // Update useEffect untuk filter leaves
  useEffect(() => {
    const leavesRef = ref(db, 'studentLeaves');
    const unsubscribe = onValue(leavesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const leavesList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<StudentLeave, 'id'>)
        }));

        // Filter leaves berdasarkan status siswa (tidak dihapus)
        const activeLeaves = leavesList.filter(leave => {
          const student = students.find(s => s.id === leave.studentId);
          // Hanya tampilkan perizinan jika siswa ditemukan dan tidak dalam status terhapus
          return student && !student.isDeleted;
        });

        // Group by date
        const groupedByDate = activeLeaves.reduce((acc, leave) => {
          if (!acc[leave.startDate]) {
            acc[leave.startDate] = [];
          }
          acc[leave.startDate].push(leave);
          return acc;
        }, {} as Record<string, StudentLeave[]>);

        // Sort leaves by date and set state
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );

        const filteredLeaves = sortedDates
          .filter(date => {
            if (selectedDate) {
              return date === selectedDate;
            }
            return true;
          })
          .reduce((acc, date) => {
            return [...acc, ...groupedByDate[date]];
          }, [] as StudentLeave[]);

        setFilteredLeavesByDate(filteredLeaves);
      } else {
        setFilteredLeavesByDate([]);
      }
    });

    return () => unsubscribe();
  }, [selectedDate, students]); // Tambahkan students sebagai dependency

  return (
    <div className="space-y-6">
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
              className="w-[400px] h-[400px] object-cover"
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

      {/* Header dan Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {filteredLeavesByDate.length > 0 && (
            <button
              onClick={shareToWhatsApp}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Share className="h-5 w-5" />
              <span>Share WhatsApp</span>
            </button>
          )}
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span>Tambah Perizinan</span>
          </button>
        </div>
      </div>

      {/* Daftar Perizinan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLeavesByDate.map((leave) => {
          const student = students.find(s => s.id === leave.studentId);
          if (!student) return null;

          return (
            <div key={leave.id} className="flex bg-white rounded-xl overflow-hidden">
              {/* Left Color Bar */}
              <div className={`w-2 flex-shrink-0 ${
                leave.returnStatus === 'Sudah Kembali' ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              
              {/* Content */}
              <div className="flex-1 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => student.photoUrl && setPreviewPhoto(student.photoUrl)}
                    >
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {student.fullName.split(' ').map(name => name[0]).join('').substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{student.fullName}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                          {student.class}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                          {student.barak}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-start sm:self-center ${
                    leave.leaveType === 'Sakit' ? 'bg-red-50 text-red-700' :
                    leave.leaveType === 'Izin' ? 'bg-blue-50 text-blue-700' :
                    leave.leaveType === 'Pulang' ? 'bg-green-50 text-green-700' :
                    leave.leaveType === 'Lomba' ? 'bg-purple-50 text-purple-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {leave.leaveType}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Leave Details */}
                  <div className="space-y-2">
                    <div>
                      <select
                        value={leave.returnStatus || 'Belum Kembali'}
                        onChange={(e) => handleStatusChange(leave, e.target.value as ReturnStatus)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-poppins ${
                          leave.returnStatus === 'Sudah Kembali'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        <option value="Belum Kembali" className="font-poppins">Belum Kembali</option>
                        <option value="Sudah Kembali" className="font-poppins">Sudah Kembali</option>
                      </select>
                      {leave.keterangan && (
                        <p className="text-sm text-gray-500 mt-2">{leave.keterangan}</p>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">
                        {leave.startDate} {leave.startTime} s/d {leave.endDate} {leave.endTime}
                      </span>
                      <span className="sm:hidden">
                        {new Date(leave.startDate).getDate()}/{new Date(leave.startDate).getMonth() + 1} {leave.startTime.substring(0, 5)} - {' '}
                        {new Date(leave.endDate).getDate()}/{new Date(leave.endDate).getMonth() + 1} {leave.endTime.substring(0, 5)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {leave.documentUrl && (
                        <button
                          onClick={() => handleViewDocument(leave)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat Dokumen"
                        >
                          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Desktop buttons */}
                      <div className="hidden sm:flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(leave)}
                          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(leave.id)}
                          className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                      
                      {/* Mobile dropdown */}
                      <div className="sm:hidden relative">
                        <button
                          onClick={() => setOpenActionId(openActionId === leave.id ? null : leave.id)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4 text-blue-500" />
                        </button>
                        
                        {openActionId === leave.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-lg shadow-lg border py-1 z-10">
                            <button
                              onClick={() => {
                                handleEdit(leave);
                                setOpenActionId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(leave.id);
                                setOpenActionId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredLeavesByDate.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada perizinan yang dibuat hari ini</h3>
          <p className="mt-1 text-sm text-gray-500">
            Klik tombol "Tambah Perizinan" untuk membuat perizinan baru
          </p>
        </div>
      )}

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-[1200px] rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {editingLeave ? 'Edit Perizinan' : 'Tambah Perizinan Baru'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3  gap-6">
                    {/* Kolom 1: Pilih Siswa */}
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {editingLeave ? 'Siswa' : 'Pilih Siswa'} {selectedStudents.length > 0 && `(${selectedStudents.length} dipilih)`}
                        </label>
                        <div className="relative" ref={dropdownRef}>
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
                            readOnly={!!editingLeave}
                          />
                          {/* Tampilkan siswa yang sudah dipilih */}
                          {selectedStudents.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-gray-500 mb-2">
                                {selectedStudents.length} siswa terpilih
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto p-1">
                                {selectedStudents.map((student) => (
                                  <div
                                    key={student.id}
                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                      student.gender === 'Laki-laki'
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'bg-pink-50 border border-pink-200'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-1">
                                        <span className={`text-sm font-medium truncate ${
                                          student.gender === 'Laki-laki' ? 'text-blue-700' : 'text-pink-700'
                                        }`}>
                                          {student.fullName}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                          student.gender === 'Laki-laki'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-pink-100 text-pink-600'
                                        }`}>
                                          {student.class}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {student.barak}
                                      </div>
                                    </div>
                                    {!editingLeave && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStudents(prev => prev.filter(s => s.id !== student.id))}
                                        className={`ml-2 p-1 rounded-full hover:bg-opacity-80 ${
                                          student.gender === 'Laki-laki'
                                            ? 'hover:bg-blue-100 text-blue-600'
                                            : 'hover:bg-pink-100 text-pink-600'
                                        }`}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Dropdown */}
                          {!editingLeave && isDropdownOpen && filteredStudents.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
                              {filteredStudents
                                .filter(student => !selectedStudents.some(s => s.id === student.id))
                                .map((student) => (
                                  <div
                                    key={student.id}
                                    onClick={() => {
                                      setSelectedStudents(prev => [...prev, student]);
                                      setSearchTerm('');
                                    }}
                                    className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium">{student.fullName}</div>
                                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        student.gender === 'Laki-laki'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-pink-100 text-pink-800'
                                      }`}>
                                        {student.gender}
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                      <span className="px-2 py-0.5 rounded bg-gray-100">{student.class}</span>
                                      <span className="text-gray-400">•</span>
                                      <span className="px-2 py-0.5 rounded bg-gray-100">{student.barak}</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Kolom 2: Jenis Izin dan Waktu */}
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jenis Izin
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {leaveTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setNewLeave({ ...newLeave, leaveType: type })}
                              className={`p-2 rounded-lg transition-colors ${
                                newLeave.leaveType === type
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Waktu Izin
                        </label>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Mulai</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                value={newLeave.startDate}
                                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                                className="w-full p-2.5 text-sm border rounded-md"
                              />
                              <input
                                type="time"
                                value={newLeave.startTime}
                                onChange={(e) => setNewLeave({ ...newLeave, startTime: e.target.value })}
                                className="w-full p-2.5 text-sm border rounded-md"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Selesai</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                value={newLeave.endDate}
                                onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                                className="w-full p-2.5 text-sm border rounded-md"
                              />
                              <input
                                type="time"
                                value={newLeave.endTime}
                                onChange={(e) => setNewLeave({ ...newLeave, endTime: e.target.value })}
                                className="w-full p-2.5 text-sm border rounded-md"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kolom 3: Keterangan dan Upload */}
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Keterangan
                        </label>
                        <textarea
                          value={newLeave.keterangan}
                          onChange={(e) => setNewLeave({ ...newLeave, keterangan: e.target.value })}
                          className="w-full p-2.5 text-sm border rounded-md min-h-[120px]"
                          placeholder="Tambahkan keterangan..."
                        />
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bukti Surat/Dokumen
                        </label>
                        {editingLeave && editingLeave.documentUrl ? (
                          <div className="mb-3 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
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
                        <div className="space-y-2">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                          <p className="text-sm text-gray-500">
                            {editingLeave?.documentUrl 
                              ? "Upload file baru untuk mengganti dokumen yang ada" 
                              : "Upload file (PDF, JPG, PNG)"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg ${
                        selectedStudents.length === 0 
                          ? 'bg-gray-400 cursor-not-allowed text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                      disabled={selectedStudents.length === 0}
                    >
                      {editingLeave ? 'Update' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {isDocumentModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => {
            setIsDocumentModalOpen(false);
            setSelectedDocument(null);
          }}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl flex flex-col relative">
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold">Dokumen Perizinan</h2>
                  {selectedStudents[0] && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {selectedStudents[0].fullName}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => {
                    setIsDocumentModalOpen(false);
                    setSelectedDocument(null);
                  }} 
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Document Viewer */}
              <div className="flex-1 min-h-[60vh] max-h-[80vh] overflow-hidden p-4">
                <div className="w-full h-full rounded-lg border shadow-inner bg-gray-50">
                  {selectedDocument.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${selectedDocument}#view=FitH`}
                      className="w-full h-full rounded-lg"
                      title="Document Preview"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img 
                        src={selectedDocument}
                        alt="Document Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t">
                <div className="flex justify-end space-x-3">
                  <a 
                    href={selectedDocument} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Buka di Tab Baru
                  </a>
                  <button
                    onClick={() => {
                      setIsDocumentModalOpen(false);
                      setSelectedDocument(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50"></div>
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-8 max-w-md mx-auto relative">
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
        </div>
      )}

      {/* Asrama Alert Modal */}
      {showAsramaAlert && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50"></div>
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-8 max-w-md mx-auto relative">
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
        </div>
      )}

      {/* Status Confirmation Modal */}
      {showStatusConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => {
            setShowStatusConfirmModal(false);
            setSelectedLeaveForStatus(null);
            setNewStatus(null);
          }}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Konfirmasi Perubahan Status</h2>
                  <button onClick={() => {
                    setShowStatusConfirmModal(false);
                    setSelectedLeaveForStatus(null);
                    setNewStatus(null);
                  }} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
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
