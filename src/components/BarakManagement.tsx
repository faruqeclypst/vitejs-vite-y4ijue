import React, { useState } from 'react';
import { useBarak } from '../contexts/BarakContext';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import { Barak } from '../types';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

const BarakManagement: React.FC = () => {
  const { baraks, addBarak, updateBarak, deleteBarak } = useBarak();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarak, setEditingBarak] = useState<Barak | null>(null);
  const [newBarak, setNewBarak] = useState<Omit<Barak, 'id'>>({
    name: '',
    capacity: 0,
    currentOccupancy: 0
  });
  const { alert, showAlert, hideAlert } = useAlert();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBarak) {
        await updateBarak(editingBarak.id, newBarak);
        showAlert({
          type: 'success',
          message: 'Data barak berhasil diperbarui'
        });
      } else {
        await addBarak(newBarak);
        showAlert({
          type: 'success',
          message: 'Data barak berhasil ditambahkan'
        });
      }
      setNewBarak({ name: '', capacity: 0, currentOccupancy: 0 });
      setIsModalOpen(false);
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
    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus barak ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteBarak(id);
        showAlert({
          type: 'success',
          message: 'Barak berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus barak'
        });
      }
    }
  };

  const openModal = () => {
    setEditingBarak(null);
    setNewBarak({ name: '', capacity: 0, currentOccupancy: 0 });
    setIsModalOpen(true);
  };

  return (
    <div className="w-full">
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

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={openModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Barak
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barak</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kapasitas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terisi</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {baraks.map((barak) => (
              <tr key={barak.id}>
                <td className="px-6 py-4 whitespace-nowrap">{barak.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{barak.capacity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{barak.currentOccupancy}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(barak)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(barak.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingBarak ? 'Edit Barak' : 'Tambah Barak'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Barak
                  </label>
                  <input
                    type="text"
                    value={newBarak.name}
                    onChange={(e) => setNewBarak({ ...newBarak, name: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kapasitas
                  </label>
                  <input
                    type="number"
                    value={newBarak.capacity}
                    onChange={(e) => setNewBarak({ ...newBarak, capacity: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-md"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terisi
                  </label>
                  <input
                    type="number"
                    value={newBarak.currentOccupancy}
                    onChange={(e) => setNewBarak({ ...newBarak, currentOccupancy: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-md"
                    required
                    min="0"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingBarak ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarakManagement;