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
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const handleSubmit = (teacher: Omit<Teacher, 'id'>) => {
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacher);
      showAlert({ type: 'success', message: 'Guru berhasil diperbarui' });
      setEditingTeacher(null);
    } else {
      addTeacher(teacher);
      showAlert({ type: 'success', message: 'Guru berhasil ditambahkan' });
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Kelola Guru</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <TeacherForm onSubmit={handleSubmit} initialTeacher={editingTeacher} />
        </div>
        <div>
          <TeacherList teachers={teachers} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      </div>
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          duration={alert.duration}
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
    </div>
  );
};

export default TeachersPage;