import React, { useState } from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, ReturnStatus } from '../types';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';

interface StudentLeaveHistoryProps {
  student: Student;
  onClose: () => void;
}

const StudentLeaveHistory: React.FC<StudentLeaveHistoryProps> = ({ student, onClose }) => {
  const { getStudentLeaves, updateLeave } = useStudentLeave();
  const { user: currentUser } = useAuth();
  // Ubah untuk tetap menampilkan perizinan meskipun siswa dihapus
  const leaves = getStudentLeaves(student.id);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [selectedLeaveForStatus, setSelectedLeaveForStatus] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<ReturnStatus | null>(null);

  const handleViewDocument = (documentUrl: string) => {
    setSelectedDocument(documentUrl);
  };

  // Update fungsi confirmStatusChange
  const confirmStatusChange = async () => {
    if (!selectedLeaveForStatus || !newStatus || student.isDeleted) return;

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

  // Update handleStatusChange
  const handleStatusChange = async (leave: any, status: ReturnStatus) => {
    // Cek apakah user memiliki akses dan siswa tidak dalam status terhapus
    if (student.isDeleted || (currentUser?.role !== 'pengasuh' && currentUser?.role !== 'admin_asrama')) {
      if (student.isDeleted) {
        showAlert({
          type: 'error',
          message: 'Tidak dapat mengubah status perizinan siswa yang telah dihapus'
        });
      }
      return;
    }

    setSelectedLeaveForStatus(leave);
    setNewStatus(status);
    setShowStatusConfirmModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl max-h-[95vh] flex flex-col"> {/* Ubah rounded-lg menjadi rounded-2xl */}
        {/* Header */}
        <div className="p-3 sm:p-6 bg-gray-50 border-b rounded-t-2xl"> {/* Tambahkan rounded-t-2xl */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 break-words">
                Riwayat Perizinan - {student.fullName}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Kelas: {student.class} | Barak: {student.barak}
              </p>
            </div>
            <button
              onClick={onClose}
              className="self-end sm:self-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm"
            >
              Tutup
            </button>
          </div>
        </div>

        {student.isDeleted && (
          <div className="p-3 sm:p-4 bg-red-50 border-b">
            <p className="text-red-600 text-sm">
              Siswa ini telah dihapus. Status perizinan tidak dapat diubah.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Tabel Riwayat */}
          <div className={`${
            selectedDocument ? 'hidden lg:block lg:w-1/2' : 'w-full'
          } overflow-auto`}>
            <div className="p-3 sm:p-4">
              <div className="overflow-x-auto">
                {/* Mobile View */}
                <div className="lg:hidden space-y-4">
                  {leaves.length > 0 ? (
                    leaves.map((leave, index) => (
                      <div key={leave.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {leave.leaveType}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <div className="text-gray-500">Waktu Keluar:</div>
                            <div>{leave.startDate} {leave.startTime}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Waktu Kembali:</div>
                            <div>{leave.endDate} {leave.endTime}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Keterangan:</div>
                            <div className="break-words">{leave.keterangan || '-'}</div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              {leave.documentUrl ? (
                                <button
                                  onClick={() => handleViewDocument(leave.documentUrl!)}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-lg"
                                >
                                  Lihat Dokumen
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">Tidak ada dokumen</span>
                              )}
                            </div>
                            <div>
                              {(currentUser?.role === 'pengasuh' || currentUser?.role === 'admin_asrama') && !student.isDeleted ? (
                                <select
                                  value={leave.returnStatus || 'Belum Kembali'}
                                  onChange={(e) => handleStatusChange(leave, e.target.value as ReturnStatus)}
                                  className={`px-2 py-1 text-xs rounded-lg ${
                                    leave.returnStatus === 'Sudah Kembali'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  <option value="Belum Kembali">Belum Kembali</option>
                                  <option value="Sudah Kembali">Sudah Kembali</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-lg ${
                                  leave.returnStatus === 'Sudah Kembali'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {leave.returnStatus || 'Belum Kembali'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Tidak ada riwayat perizinan
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <table className="hidden lg:table min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">No</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                      <th className="hidden sm:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keluar</th>
                      <th className="hidden sm:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kembali</th>
                      <th className="hidden md:table-cell px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaves.length > 0 ? (
                      leaves.map((leave, index) => (
                        <tr key={leave.id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-2 py-3">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {leave.leaveType}
                            </span>
                            {/* Mobile view dates */}
                            <div className="sm:hidden text-xs text-gray-500 mt-1">
                              {leave.startDate} {leave.startTime}
                              <br />
                              {leave.endDate} {leave.endTime}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-2 py-3 text-sm text-gray-500">
                            {leave.startDate}<br/>{leave.startTime}
                          </td>
                          <td className="hidden sm:table-cell px-2 py-3 text-sm text-gray-500">
                            {leave.endDate}<br/>{leave.endTime}
                          </td>
                          <td className="hidden md:table-cell px-2 py-3">
                            <div className="max-w-xs truncate text-sm" title={leave.keterangan}>
                              {leave.keterangan}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            {(currentUser?.role === 'pengasuh' || currentUser?.role === 'admin_asrama') && !student.isDeleted ? (
                              <select
                                value={leave.returnStatus || 'Belum Kembali'}
                                onChange={(e) => handleStatusChange(leave, e.target.value as ReturnStatus)}
                                className={`w-full px-2 py-1 text-xs rounded-lg ${
                                  leave.returnStatus === 'Sudah Kembali'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                <option value="Belum Kembali">Belum Kembali</option>
                                <option value="Sudah Kembali">Sudah Kembali</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg ${
                                leave.returnStatus === 'Sudah Kembali'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {leave.returnStatus || 'Belum Kembali'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {leave.documentUrl ? (
                              <button
                                className="px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                                onClick={() => handleViewDocument(leave.documentUrl!)}
                              >
                                Lihat
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-2 py-8 text-center text-gray-500">
                          Tidak ada riwayat perizinan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Preview Dokumen */}
          {selectedDocument && (
            <div className="lg:w-1/2 p-3 sm:p-4 border-t lg:border-t-0 lg:border-l bg-gray-50 flex flex-col min-h-0">
              <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Preview Dokumen</h3>
                  <div className="mt-1 text-xs sm:text-sm text-gray-600 space-y-1">
                    <p>
                      Keluar: {leaves.find(l => l.documentUrl === selectedDocument)?.startDate}{' '}
                      {leaves.find(l => l.documentUrl === selectedDocument)?.startTime}
                    </p>
                    <p>
                      Kembali: {leaves.find(l => l.documentUrl === selectedDocument)?.endDate}{' '}
                      {leaves.find(l => l.documentUrl === selectedDocument)?.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                    onClick={() => window.open(selectedDocument, '_blank')}
                    title="Buka di Tab Baru"
                  >
                    Lihat
                  </button>
                  <button
                    className="px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                    onClick={async () => {
                      try {
                        // Dapatkan nama file dari URL
                        const fileName = selectedDocument.split('/').pop()?.split('?')[0] || 'dokumen-izin';
                        
                        // Dapatkan path file dari URL
                        const filePath = decodeURIComponent(selectedDocument.split('/o/')[1].split('?')[0]);
                        
                        // Dapatkan download URL yang valid
                        const storage = getStorage();
                        const fileRef = storageRef(storage, filePath);
                        const downloadURL = await getDownloadURL(fileRef);
                        
                        // Buat link untuk download
                        const link = document.createElement('a');
                        link.href = downloadURL;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                      } catch (error) {
                        console.error('Error downloading document:', error);
                        showAlert({
                          type: 'error',
                          message: 'Gagal mengunduh dokumen'
                        });
                      }
                    }}
                    title="Download Dokumen"
                  >
                    Download
                  </button>
                  <button
                    className="px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                    onClick={() => setSelectedDocument(null)}
                    title="Tutup Preview"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              
              {/* Container untuk iframe dengan loading state */}
              <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 min-h-0">
                {/* Loading indicator */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
                
                {/* Document viewer */}
                <iframe
                  src={selectedDocument}
                  className="relative z-10 w-full h-full rounded-lg bg-white"
                  title="Document Preview"
                  onLoad={(e) => {
                    // Sembunyikan loading indicator saat dokumen selesai dimuat
                    const iframe = e.target as HTMLIFrameElement;
                    const parent = iframe.parentElement;
                    if (parent) {
                      const loader = parent.querySelector('div.absolute');
                      if (loader && loader instanceof HTMLElement) {
                        loader.style.display = 'none';
                      }
                    }
                  }}
                />
              </div>

              {/* Footer dengan informasi */}
              <div className="mt-3 text-sm text-gray-500">
                <p>Klik tombol download untuk mengunduh dokumen</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Konfirmasi Status - Update rounded juga */}
        {showStatusConfirmModal && (
          <div className="fixed inset-0 z-[60] overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-auto"> {/* Ubah rounded-lg menjadi rounded-2xl */}
              <h3 className="text-lg font-bold mb-4">Konfirmasi Perubahan Status</h3>
              <p className="text-gray-600 mb-6">
                Apakah Anda yakin ingin mengubah status menjadi "{newStatus}"?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  onClick={() => {
                    setShowStatusConfirmModal(false);
                    setSelectedLeaveForStatus(null);
                    setNewStatus(null);
                  }}
                >
                  Batal
                </button>
                <button
                  className="px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                  onClick={confirmStatusChange}
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert */}
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={hideAlert}
          />
        )}
      </div>
    </div>
  );
};

export default StudentLeaveHistory;
