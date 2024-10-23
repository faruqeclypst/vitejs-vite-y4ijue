import React from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { Student } from '../types';
import { X } from 'lucide-react';

interface StudentLeaveHistoryProps {
  student: Student;
  onClose: () => void;
}

const StudentLeaveHistory: React.FC<StudentLeaveHistoryProps> = ({ student, onClose }) => {
  const { getStudentLeaves } = useStudentLeave();
  const leaves = getStudentLeaves(student.id);

  const handleViewDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
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
        <div className="p-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Izin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Jam Keluar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Jam Kembali</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bukti</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaves.length > 0 ? (
                leaves.map((leave, index) => (
                  <tr key={leave.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{leave.leaveType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {leave.startDate} {leave.startTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {leave.endDate} {leave.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{leave.keterangan}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada riwayat perizinan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLeaveHistory;
