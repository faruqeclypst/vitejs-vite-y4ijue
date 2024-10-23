import React, { useState } from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, ReturnStatus } from '../types';
import { X } from 'lucide-react';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';

interface StudentLeaveHistoryProps {
  student: Student;
  onClose: () => void;
}

const StudentLeaveHistory: React.FC<StudentLeaveHistoryProps> = ({ student, onClose }) => {
  const { getStudentLeaves, updateLeave } = useStudentLeave();
  const { user: currentUser } = useAuth();
  const leaves = getStudentLeaves(student.id);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [selectedLeaveForStatus, setSelectedLeaveForStatus] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<ReturnStatus | null>(null);

  const handleViewDocument = (documentUrl: string) => {
    setSelectedDocument(documentUrl);
  };

  // Tambahkan fungsi untuk menangani perubahan status
  const handleStatusChange = async (leave: any, status: ReturnStatus) => {
    // Hanya pengasuh dan admin_asrama yang bisa mengubah status
    if (currentUser?.role !== 'pengasuh' && currentUser?.role !== 'admin_asrama') return;

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

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-[95%] max-w-7xl rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Riwayat Perizinan - {student.fullName}
            </h2>
            <p className="text-sm text-gray-600">
              Kelas: {student.class} | Asrama: {student.asrama}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex h-[80vh]">
          {/* Tabel Riwayat */}
          <div className={`${selectedDocument ? 'w-1/2' : 'w-full'} overflow-auto p-6 border-r`}>
            <div className="min-w-[800px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Izin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Jam Keluar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Jam Kembali</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Kembali</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bukti</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaves.length > 0 ? (
                    leaves.map((leave, index) => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">{index + 1}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg">
                            {leave.leaveType}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {leave.startDate} {leave.startTime}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {leave.endDate} {leave.endTime}
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-xs truncate" title={leave.keterangan}>
                            {leave.keterangan}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(currentUser?.role === 'pengasuh' || currentUser?.role === 'admin_asrama') ? (
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
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {leave.documentUrl ? (
                            <button
                              onClick={() => handleViewDocument(leave.documentUrl!)}
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
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Tidak ada riwayat perizinan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview Dokumen */}
          {selectedDocument && (
            <div className="w-1/2 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Preview Dokumen</h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <iframe
                src={selectedDocument}
                className="w-full h-full rounded-lg border"
                title="Document Preview"
              />
            </div>
          )}

          {/* Modal Konfirmasi Status */}
          {showStatusConfirmModal && (
            <div className="fixed inset-0 z-[60] overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
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
      </div>
    </div>
  );
};

export default StudentLeaveHistory;
