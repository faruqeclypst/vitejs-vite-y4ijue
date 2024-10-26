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

      {/* Daftar Pelanggaran */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredViolations.map((violation) => {
          const student = students.find(s => s.id === violation.studentId);
          if (!student) return null;

          return (
            <div key={violation.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    violation.violationType === 'Ringan' ? 'bg-yellow-100 text-yellow-800' :
                    violation.violationType === 'Sedang' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {violation.violationType}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(violation.recordedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium">{student.fullName}</h3>
                  <p className="text-sm text-gray-600">{student.class} - {student.barak}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Pelanggaran:</p>
                  <p className="text-sm text-gray-600">{violation.violationDetail}</p>
                  <p className="text-sm text-gray-500 mt-1">{violation.description}</p>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingViolation(violation);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(violation.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => setSelectedStudentForHistory(student)}
                    className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    Riwayat
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => {
            setIsModalOpen(false);
            setEditingViolation(null);
          }} />
          
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <ViolationForm
              onSubmit={handleSubmit}
              initialViolation={editingViolation}
              onClose={() => {
                setIsModalOpen(false);
                setEditingViolation(null);
              }}
              students={students}
            />
          </div>
        </div>
      )}

      {/* Alerts and Modals */}
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
