import React, { useState } from 'react';
import { useGuidance } from '../contexts/GuidanceContext';
import { useViolation } from '../contexts/ViolationContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search } from 'lucide-react';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import GuidanceForm from './GuidanceForm';

const GuidanceManagement: React.FC = () => {
  const { guidances, addGuidance, updateGuidance, deleteGuidance } = useGuidance();
  const { getActiveViolations } = useViolation();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGuidance, setEditingGuidance] = useState<any>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  // Ambil pelanggaran yang belum dibina
  const unhandledViolations = getActiveViolations().filter(violation => {
    const existingGuidance = guidances.find(g => g.violationId === violation.id);
    return !existingGuidance;
  });

  const handleEdit = async (guidance: any) => {
    setEditingGuidance(guidance);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus data pembinaan ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteGuidance(id);
        showAlert({
          type: 'success',
          message: 'Data pembinaan berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus data pembinaan'
        });
      }
    }
  };

  const handleSubmit = async (guidanceData: any) => {
    try {
      if (editingGuidance) {
        await updateGuidance(editingGuidance.id, {
          ...guidanceData,
          conductedBy: currentUser?.id || ''
        });
        showAlert({
          type: 'success',
          message: 'Data pembinaan berhasil diperbarui'
        });
      } else {
        await addGuidance({
          ...guidanceData,
          conductedBy: currentUser?.id || ''
        });
        showAlert({
          type: 'success',
          message: 'Data pembinaan berhasil ditambahkan'
        });
      }
      setIsModalOpen(false);
      setEditingGuidance(null);
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data pembinaan'
      });
    }
  };

  // Filter dan tampilkan data
  const filteredGuidances = guidances.filter(guidance => {
    const student = students.find(s => s.id === guidance.studentId);
    if (!student) return false;

    return (
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase())
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
        title={options?.title ?? ''}
        message={options?.message ?? ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />

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
          onClick={() => {
            setEditingGuidance(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Tambah Pembinaan</span>
        </button>
      </div>

      {/* GuidanceForm Modal */}
      <GuidanceForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGuidance(null);
        }}
        onSubmit={handleSubmit}
        initialGuidance={editingGuidance}
        students={students}
        unhandledViolations={unhandledViolations}
      />

      {/* Daftar Pembinaan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuidances.map((guidance) => {
          const student = students.find(s => s.id === guidance.studentId);
          if (!student) return null;

          return (
            <div key={guidance.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {guidance.guidanceStage}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(guidance.conductedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium">{student.fullName}</h3>
                  <p className="text-sm text-gray-600">{student.class}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Pembinaan:</p>
                  <p className="text-sm text-gray-600">{guidance.guidanceDetail}</p>
                  <p className="text-sm text-gray-500 mt-1">{guidance.description}</p>
                  {guidance.notes && (
                    <p className="text-sm text-gray-500 mt-1">Catatan: {guidance.notes}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(guidance)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(guidance.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuidanceManagement;
