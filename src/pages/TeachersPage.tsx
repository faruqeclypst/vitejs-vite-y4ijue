import React, { useState } from 'react';
import TeacherForm from '../components/TeacherForm';
import TeacherList from '../components/TeacherList';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTeachers } from '../contexts/TeachersContext';
import { Teacher } from '../types';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';

const TeachersPage: React.FC = () => {
  const { teachers, addTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const handleSubmit = (teacher: Omit<Teacher, 'id'>) => {
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacher);
      showAlert({ type: 'success', message: 'Guru berhasil diperbarui' });
    } else {
      addTeacher(teacher);
      showAlert({ type: 'success', message: 'Guru berhasil ditambahkan' });
    }
    setIsFormOpen(false);
    setEditingTeacher(null);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus guru ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
    });

    if (shouldDelete) {
      deleteTeacher(id);
      showAlert({ type: 'success', message: 'Guru berhasil dihapus' });
    }
  };

  const handleAdd = () => {
    setEditingTeacher(null);
    setIsFormOpen(true);
  };

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Kelola Guru
            </h1>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow-md rounded-lg p-4">
            <TeacherList
              teachers={teachers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          </div>

          {/* Modal Form */}
          {isFormOpen && (
            <div className="modal-container">
              <div className="modal-content">
                <TeacherForm
                  onSubmit={handleSubmit}
                  initialTeacher={editingTeacher}
                  onClose={() => setIsFormOpen(false)}
                />
              </div>
            </div>
          )}

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

export default TeachersPage;
