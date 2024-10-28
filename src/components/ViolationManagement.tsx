import React, { useState } from 'react';
import { useViolation } from '../contexts/ViolationContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, Violation } from '../types';
import { Plus, Search } from 'lucide-react';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import ViolationHistory from './ViolationHistory';
import ViolationForm from './ViolationForm';

const ViolationManagement: React.FC = () => {
  const { violations, addViolation, updateViolation, deleteViolation } = useViolation();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const handleSubmit = async (violationData: Omit<Violation, 'id'>) => {
    try {
      if (editingViolation) {
        await updateViolation(editingViolation.id, {
          ...violationData,
          recordedBy: currentUser?.id || '',
          recordedAt: editingViolation.recordedAt,
          isResolved: editingViolation.isResolved
        });
        showAlert({
          type: 'success',
          message: 'Data pelanggaran berhasil diperbarui'
        });
      } else {
        await addViolation({
          ...violationData,
          recordedBy: currentUser?.id || '',
          recordedAt: new Date().toISOString(),
          isResolved: false
        });
        showAlert({
          type: 'success',
          message: 'Data pelanggaran berhasil ditambahkan'
        });
      }
      setIsModalOpen(false);
      setEditingViolation(null);
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data pelanggaran'
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus data pelanggaran ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteViolation(id);
        showAlert({
          type: 'success',
          message: 'Data pelanggaran berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus data pelanggaran'
        });
      }
    }
  };

  // Filter violations berdasarkan pencarian
  const filteredViolations = violations.filter(violation => {
    const student = students.find(s => s.id === violation.studentId);
    if (!student) return false;

    return (
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.barak.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Alert dan ConfirmationModal */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
      
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />

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
              className="w-[400px] h-[400px] object-cover" // Ukuran fix 400x400
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-8 border rounded-lg"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Tambah Pelanggaran</span>
        </button>
      </div>

      {/* ViolationForm Modal */}
      <ViolationForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingViolation(null);
        }}
        onSubmit={handleSubmit}
        initialViolation={editingViolation}
        students={students}
      />

      {/* Daftar Pelanggaran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredViolations.map((violation) => {
          const student = students.find(s => s.id === violation.studentId);
          if (!student) return null;

          return (
            <div key={violation.id} className="flex bg-white rounded-xl overflow-hidden">
              {/* Left Color Bar */}
              <div className={`w-2 flex-shrink-0 ${
                violation.violationType === 'Ringan' ? 'bg-yellow-400' :
                violation.violationType === 'Sedang' ? 'bg-orange-400' :
                'bg-red-400'
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
                    <div className="min-w-0"> {/* Tambah min-w-0 untuk handle text overflow */}
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
                    violation.violationType === 'Ringan' ? 'bg-yellow-50 text-yellow-700' :
                    violation.violationType === 'Sedang' ? 'bg-orange-50 text-orange-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {violation.violationType}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Violation Details */}
                  <div className="flex gap-2">
                    <div className="mt-1 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{violation.violationDetail}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{violation.description}</p>
                    </div>
                  </div>

                  {/* Date & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(violation.recordedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedStudentForHistory(student)}
                        className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Lihat Riwayat"
                      >
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditingViolation(violation);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(violation.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Modal */}
      {selectedStudentForHistory && (
        <ViolationHistory
          student={selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}
    </div>
  );
};

export default ViolationManagement;
