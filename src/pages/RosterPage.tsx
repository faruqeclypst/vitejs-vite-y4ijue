import React from 'react';
import RosterTable from '../components/RosterTable';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { availableClasses, RosterEntry } from '../types';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';

const RosterPage: React.FC = () => {
  const { roster, addRosterEntry, deleteRosterEntry, updateRosterEntry } = useRoster();
  const { teachers } = useTeachers();
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const handleAddRosterEntry = async (entry: Omit<RosterEntry, 'id'>) => {
    try {
      await addRosterEntry(entry);
      showAlert({ type: 'success', message: 'Jadwal berhasil ditambahkan' });
    } catch (error) {
      showAlert({ type: 'error', message: 'Gagal menambahkan jadwal' });
    }
  };

  const handleUpdateRosterEntry = async (id: string, entry: Omit<RosterEntry, 'id'>) => {
    try {
      await updateRosterEntry(id, entry);
      showAlert({ type: 'success', message: 'Jadwal berhasil diperbarui' });
    } catch (error) {
      showAlert({ type: 'error', message: 'Gagal memperbarui jadwal' });
    }
  };

  const handleDeleteRosterEntry = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus jadwal ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
    });

    if (shouldDelete) {
      try {
        await deleteRosterEntry(id);
        showAlert({ type: 'success', message: 'Jadwal berhasil dihapus' });
      } catch (error) {
        showAlert({ type: 'error', message: 'Gagal menghapus jadwal' });
      }
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Kelola Jadwal
            </h1>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow-md rounded-lg p-4">
            <RosterTable
              roster={roster}
              teachers={teachers}
              onDelete={handleDeleteRosterEntry}
              onAdd={handleAddRosterEntry}
              onUpdate={handleUpdateRosterEntry}
              classes={availableClasses}
            />
          </div>

          {/* Alert */}
          {alert && (
            <Alert
              type={alert.type}
              message={alert.message}
              duration={alert.duration}
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
        </div>
      </div>
    </div>
  );
};

export default RosterPage;
