import React, { useState } from 'react';
import { useViolation } from '../contexts/ViolationContext';
import { useGuidance } from '../contexts/GuidanceContext';
import { useTeachers } from '../contexts/TeachersContext'; // Import useTeachers
import { Student, Violation } from '../types';
import { AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import ViolationForm from './ViolationForm'; // Tambah import

interface ViolationHistoryProps {
  student: Student;
  onClose: () => void;
}

const ViolationHistory: React.FC<ViolationHistoryProps> = ({ student, onClose }) => {
  const { getStudentViolations, deleteViolation, markViolationAsResolved, updateViolation } = useViolation();
  const { getViolationGuidances } = useGuidance();
  const { teachers } = useTeachers(); // Get teachers data
  const { alert, showAlert, hideAlert } = useAlert();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const violations = getStudentViolations(student.id);

  const handleDelete = async (violationId: string, hasGuidance: boolean) => {
    const message = hasGuidance 
      ? 'Apakah Anda yakin ingin menghapus pelanggaran ini? Semua riwayat pembinaan terkait juga akan dihapus.'
      : 'Apakah Anda yakin ingin menghapus pelanggaran ini?';

    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message,
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteViolation(violationId);
        showAlert({
          type: 'success',
          message: 'Pelanggaran berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus pelanggaran'
        });
      }
    }
  };

  // Fungsi untuk toggle status resolved
  const handleToggleStatus = async (violation: any) => {
    const message = violation.isResolved
      ? 'Apakah Anda yakin ingin mengubah status menjadi belum selesai?'
      : 'Apakah Anda yakin ingin menyelesaikan pelanggaran ini?';

    const confirmed = await confirm({
      title: 'Konfirmasi Ubah Status',
      message,
      confirmText: violation.isResolved ? 'Batalkan Selesai' : 'Selesaikan',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        if (violation.isResolved) {
          // Ubah ke belum selesai
          await updateViolation(violation.id, {
            ...violation,
            isResolved: false,
            resolvedAt: null
          });
        } else {
          // Selesaikan pelanggaran
          await markViolationAsResolved(violation.id);
        }
        showAlert({
          type: 'success',
          message: `Status pelanggaran berhasil ${violation.isResolved ? 'dibatalkan' : 'diselesaikan'}`
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal mengubah status pelanggaran'
        });
      }
    }
  };

  // Tambah handler untuk edit
  const handleEdit = (violation: Violation) => {
    setEditingViolation(violation);
    setShowEditForm(true);
  };

  // Handler untuk submit edit
  const handleEditSubmit = async (updatedViolation: Omit<Violation, 'id'>) => {
    if (!editingViolation) return;

    try {
      // Hanya update field yang boleh diubah
      await updateViolation(editingViolation.id, {
        ...editingViolation,
        violationType: updatedViolation.violationType,
        violationDetail: updatedViolation.violationDetail,
        description: updatedViolation.description,
      });

      showAlert({
        type: 'success',
        message: 'Pelanggaran berhasil diperbarui'
      });
      setShowEditForm(false);
      setEditingViolation(null);
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal memperbarui pelanggaran'
      });
    }
  };

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={`Riwayat Pelanggaran - ${student.fullName}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Alert */}
          {alert && (
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={hideAlert}
            />
          )}

          {/* Confirmation Modal */}
          <ConfirmationModal
            isOpen={isOpen}
            onClose={handleCancel}
            onConfirm={handleConfirm}
            title={options?.title || ''}
            message={options?.message || ''}
            confirmText={options?.confirmText}
            cancelText={options?.cancelText}
          />

          <div className="text-sm text-gray-600">
            Kelas: {student.class} | Barak: {student.barak}
          </div>

          {violations.length > 0 ? (
            <div className="space-y-6">
              {violations.map((violation) => {
                const relatedGuidances = getViolationGuidances(violation.id);
                
                return (
                  <div key={violation.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Violation Details */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            violation.violationType === 'Ringan' ? 'bg-yellow-100 text-yellow-800' :
                            violation.violationType === 'Sedang' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {violation.violationType}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(violation.recordedAt).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                            {' '}
                            {new Date(violation.recordedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <h3 className="mt-2 font-medium">{violation.violationDetail}</h3>
                        <p className="mt-1 text-sm text-gray-600">{violation.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(violation)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                            violation.isResolved 
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          }`}
                        >
                          {violation.isResolved ? 'Sudah Selesai' : 'Belum Selesai'}
                        </button>
                        
                        {/* Tampilkan tombol edit hanya jika belum ada pembinaan */}
                        {relatedGuidances.length === 0 && (
                          <button
                            onClick={() => handleEdit(violation)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="Edit Pelanggaran"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(violation.id, relatedGuidances.length > 0)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Hapus Pelanggaran"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Related Guidances */}
                    {relatedGuidances.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Riwayat Pembinaan:</h4>
                        <div className="space-y-3">
                          {relatedGuidances.map((guidance) => {
                            const teacher = teachers.find(t => t.id === guidance.conductedBy);
                            
                            return (
                              <div key={guidance.id} className="bg-white p-3 rounded-lg border">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        guidance.guidanceStage === 'Tahap 1' ? 'bg-yellow-50 text-yellow-700' :
                                        guidance.guidanceStage === 'Tahap 2' ? 'bg-orange-50 text-orange-700' :
                                        'bg-red-50 text-red-700'
                                      }`}>
                                        {guidance.guidanceStage}
                                      </span>
                                      {teacher && (
                                        <span className="text-xs text-gray-600">
                                          Pembina: {teacher.name}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-2 text-sm font-medium">{guidance.guidanceDetail}</p>
                                    <p className="mt-1 text-sm text-gray-600">{guidance.description}</p>
                                    {guidance.notes && (
                                      <p className="mt-1 text-sm text-gray-500">
                                        Catatan: {guidance.notes}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(guidance.conductedAt).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                    {' '}
                                    {new Date(guidance.conductedAt).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada riwayat pelanggaran</h3>
              <p className="mt-1 text-sm text-gray-500">
                Siswa ini belum memiliki catatan pelanggaran
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Form Edit */}
      {showEditForm && editingViolation && (
        <ViolationForm
          isOpen={showEditForm}
          onClose={() => {
            setShowEditForm(false);
            setEditingViolation(null);
          }}
          onSubmit={handleEditSubmit}
          initialViolation={editingViolation}
          students={[student]} // Kirim hanya student yang sedang dilihat
          mode="edit" // Tambah prop mode untuk membatasi field yang bisa diedit
        />
      )}
    </>
  );
};

export default ViolationHistory;
