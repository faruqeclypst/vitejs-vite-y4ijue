import React from 'react';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
// Menghapus import yang tidak digunakan
// import { useAuth } from '../contexts/AuthContext';
import { Student, ReturnStatus } from '../types';
import { AlertCircle } from 'lucide-react';
import Modal from './Modal';

interface StudentLeaveHistoryProps {
  student: Student;
  onClose: () => void;
}

const StudentLeaveHistory: React.FC<StudentLeaveHistoryProps> = ({ student, onClose }) => {
  const { getStudentLeaves } = useStudentLeave();
  // Menghapus baris berikut karena tidak digunakan
  // const { user: currentUser } = useAuth();

  const leaves = getStudentLeaves(student.id);

  const getStatusColor = (returnStatus?: ReturnStatus) => {
    switch (returnStatus) {
      case 'Sudah Kembali':
        return 'bg-green-100 text-green-800';
      case 'Belum Kembali':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Riwayat Perizinan - ${student.fullName}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Kelas: {student.class} | Barak: {student.barak}
        </div>

        {leaves.length > 0 ? (
          <div className="space-y-6">
            {leaves.map((leave) => (
              <div key={leave.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        leave.leaveType === 'Sakit' ? 'bg-red-100 text-red-800' :
                        leave.leaveType === 'Izin' ? 'bg-blue-100 text-blue-800' :
                        leave.leaveType === 'Pulang' ? 'bg-green-100 text-green-800' :
                        leave.leaveType === 'Lomba' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {leave.leaveType}
                      </span>
                      {leave.returnStatus && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(leave.returnStatus)}`}>
                          {leave.returnStatus}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="text-sm text-gray-600">
                        Mulai: {new Date(leave.startDate).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} {leave.startTime}
                      </div>
                      <div className="text-sm text-gray-600">
                        Selesai: {new Date(leave.endDate).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} {leave.endTime}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{leave.keterangan}</p>
                    {leave.documentUrl && (
                      <div className="mt-2">
                        <a
                          href={leave.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Lihat Dokumen
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada riwayat perizinan</h3>
            <p className="mt-1 text-sm text-gray-500">
              Siswa ini belum memiliki catatan perizinan
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StudentLeaveHistory;
