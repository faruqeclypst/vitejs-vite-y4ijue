import React, { useState, useEffect } from 'react';
import TeacherList from '../components/TeacherList';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTeachers } from '../contexts/TeachersContext';
import { Teacher } from '../types';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';

const TeachersPage: React.FC = () => {
  const { allTeachers, addTeacher, updateTeacher, deleteTeacher, restoreTeacher, deleteTeacherPermanently } = useTeachers();
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  // Tambahkan useEffect untuk mengatur overflow pada body
  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFormOpen]);

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

  const handleRestore = async (id: string) => {
    const shouldRestore = await confirm({
      title: 'Konfirmasi Pemulihan',
      message: 'Apakah Anda yakin ingin memulihkan guru ini?',
      confirmText: 'Ya, Pulihkan',
      cancelText: 'Batal',
    });

    if (shouldRestore) {
      try {
        await restoreTeacher(id);
        showAlert({ type: 'success', message: 'Guru berhasil dipulihkan' });
      } catch (error) {
        showAlert({ type: 'error', message: 'Gagal memulihkan guru' });
      }
    }
  };

  const handleDeletePermanent = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Konfirmasi Hapus Permanen',
      message: 'Apakah Anda yakin ingin menghapus guru ini secara permanen?',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal',
    });

    if (shouldDelete) {
      try {
        await deleteTeacherPermanently(id);
        showAlert({ type: 'success', message: 'Guru berhasil dihapus secara permanen' });
      } catch (error) {
        showAlert({ type: 'error', message: 'Gagal menghapus guru secara permanen' });
      }
    }
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
          }}>Kelola Guru</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600 hidden sm:block">Kelola data dan informasi guru pengajar</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <TeacherList
              teachers={allTeachers}
              showModal={isFormOpen}
              onOpenModal={() => {
                setEditingTeacher(null);
                setIsFormOpen(true);
              }}
              onCloseModal={() => {
                setIsFormOpen(false);
                setEditingTeacher(null);
              }}
              onSubmit={handleSubmit}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onDeletePermanent={handleDeletePermanent}
              selectedTeacher={editingTeacher}
            />
          </div>
        </div>

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
      </div>
    </div>
  );
};

export default TeachersPage;
