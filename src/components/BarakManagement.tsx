import React, { useState } from 'react';
import { useBarak } from '../contexts/BarakContext';
import { Plus, Edit, Trash2, Home, Search } from 'lucide-react';
import { Barak } from '../types';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import Modal from './Modal';

const BarakManagement: React.FC = () => {
  const { baraks, addBarak, updateBarak, deleteBarak, checkBarakHasStudents } = useBarak();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarak, setEditingBarak] = useState<Barak | null>(null);
  const [newBarak, setNewBarak] = useState<Omit<Barak, 'id'>>({
    name: '',
    gender: 'Laki-laki'
  });
  const { alert, showAlert, hideAlert } = useAlert();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBarak) {
        // Tutup modal form terlebih dahulu
        setIsModalOpen(false);
        
        const confirmed = await confirm({
          title: 'Konfirmasi Update',
          message: 'Mengubah data barak akan mengubah data siswa yang terkait. Lanjutkan?',
          confirmText: 'Ya, Update',
          cancelText: 'Batal'
        });

        if (confirmed) {
          await updateBarak(editingBarak.id, newBarak);
          showAlert({
            type: 'success',
            message: 'Data barak dan siswa terkait berhasil diperbarui'
          });
          setNewBarak({ name: '', gender: 'Laki-laki' });
        } else {
          // Jika user membatalkan, buka kembali modal form
          setIsModalOpen(true);
          return;
        }
      } else {
        await addBarak(newBarak);
        showAlert({
          type: 'success',
          message: 'Data barak berhasil ditambahkan'
        });
        setNewBarak({ name: '', gender: 'Laki-laki' });
        setIsModalOpen(false);
      }
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data barak'
      });
    }
  };

  const handleEdit = (barak: Barak) => {
    setEditingBarak(barak);
    setNewBarak(barak);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const barak = baraks.find(b => b.id === id);
    if (!barak) return;

    const hasStudents = await checkBarakHasStudents(barak.name);
    if (hasStudents) {
      showAlert({
        type: 'error',
        message: 'Tidak dapat menghapus barak karena masih ada siswa yang terdaftar'
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus barak ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        const result = await deleteBarak(id);
        showAlert({
          type: result.success ? 'success' : 'error',
          message: result.message
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus barak'
        });
      }
    }
  };

  return (
    <div className="space-y-4">
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
        confirmText={options?.confirmText ?? 'Konfirmasi'}
        cancelText={options?.cancelText ?? 'Batal'}
      />

      {/* Header dengan Search dan Add */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari barak..."
            className="w-full p-2 pl-8 border rounded-lg"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        </div>
        <button
          onClick={() => {
            setEditingBarak(null);
            setNewBarak({ name: '', gender: 'Laki-laki' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Tambah Barak</span>
        </button>
      </div>

      {/* Barak Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBarak ? 'Edit Barak' : 'Tambah Barak Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Barak
            </label>
            <input
              type="text"
              value={newBarak.name}
              onChange={(e) => setNewBarak({ ...newBarak, name: e.target.value })}
              required
              className="w-full p-2.5 text-sm border rounded-md"
              placeholder="Masukkan nama barak"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Laki-laki', 'Perempuan'].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => setNewBarak({ ...newBarak, gender: gender as 'Laki-laki' | 'Perempuan' })}
                  className={`p-2.5 rounded-md transition-colors ${
                    newBarak.gender === gender
                      ? gender === 'Laki-laki' 
                        ? 'bg-blue-500 text-white'
                        : 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {editingBarak ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Barak List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {baraks.map((barak) => (
          <div
            key={barak.id}
            className={`p-4 rounded-lg ${
              barak.gender === 'Laki-laki'
                ? 'bg-blue-500 text-white'
                : 'bg-pink-500 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{barak.name}</p>
                <p className="text-sm opacity-90">{barak.gender}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(barak)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(barak.id)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {baraks.length === 0 && (
        <div className="text-center py-12">
          <Home className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada barak</h3>
          <p className="mt-1 text-sm text-gray-500">
            Mulai dengan menambahkan barak baru
          </p>
        </div>
      )}
    </div>
  );
};

export default BarakManagement;
