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
  const { roster, addRosterEntry, updateRosterEntry } = useRoster();
  const { teachers } = useTeachers();
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmation();

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

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 cursor-pointer" onClick={(e) => {
            const target = e.currentTarget.nextElementSibling as HTMLElement;
            if (target) {
              target.classList.toggle('hidden');
              target.classList.toggle('sm:block');
            }
          }}>Kelola Jadwal</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600 hidden sm:block">Atur jadwal mengajar guru dan mata pelajaran</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <RosterTable
              roster={roster}
              teachers={teachers}
              onAdd={handleAddRosterEntry}
              onUpdate={handleUpdateRosterEntry}
              classes={availableClasses}
            />
          </div>
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
  );
};

export default RosterPage;
