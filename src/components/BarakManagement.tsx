import React, { useState } from 'react';
import { useBarak } from '../contexts/BarakContext';
import { Plus, X, Edit, Trash2, Home, Search } from 'lucide-react';
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
    gender: 'Laki-laki'
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
      setNewBarak({ name: '', gender: 'Laki-laki' });
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
    setNewBarak({
      name: '',
      gender: 'Laki-laki'
    });
    setIsModalOpen(true);
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
          onClick={openModal}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Tambah Barak</span>
        </button>
      </div>

      {/* Table/Card View */}
      <div className="overflow-x-auto">
        {/* Desktop View */}
        <div className="hidden sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barak</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {baraks.map((barak) => (
                <tr key={barak.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{barak.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      barak.gender === 'Laki-laki' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {barak.gender}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-1">
                    <button
                      onClick={() => handleEdit(barak)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(barak.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-2">
          {baraks.map((barak) => (
            <div key={barak.id} className="bg-white p-3 rounded-lg shadow-sm border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{barak.name}</h3>
                  <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded-full ${
                    barak.gender === 'Laki-laki' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-pink-100 text-pink-800'
                  }`}>
                    {barak.gender}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(barak)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(barak.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {baraks.length === 0 && (
        <div className="text-center py-6">
          <Home className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada barak</h3>
          <p className="mt-1 text-sm text-gray-500">
            Mulai dengan menambahkan barak baru
          </p>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {editingBarak ? 'Edit Barak' : 'Tambah Barak Baru'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
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

                  <div className="flex justify-end space-x-3 pt-4 border-t">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarakManagement;
