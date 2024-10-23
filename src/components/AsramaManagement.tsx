import React, { useState } from 'react';
import { useAsrama } from '../contexts/AsramaContext';
import { Plus, Edit, Trash2, X } from 'lucide-react';

const AsramaManagement: React.FC = () => {
  const { asramas, addAsrama, updateAsrama, deleteAsrama } = useAsrama();
  const [newAsramaName, setNewAsramaName] = useState('');
  const [editingAsrama, setEditingAsrama] = useState<{ id: string; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsrama) {
      await updateAsrama(editingAsrama.id, newAsramaName, editingAsrama.name);
      setEditingAsrama(null);
    } else {
      addAsrama(newAsramaName);
    }
    setNewAsramaName('');
    setIsModalOpen(false);
  };

  const handleEdit = (asrama: { id: string; name: string }) => {
    setEditingAsrama(asrama);
    setNewAsramaName(asrama.name);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus asrama ini?')) {
      deleteAsrama(id);
    }
  };

  const openModal = () => {
    setEditingAsrama(null);
    setNewAsramaName('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <div className="flex justify-between items-center">
        <button
          onClick={openModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Asrama
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingAsrama ? 'Edit Asrama' : 'Tambah Asrama Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Asrama</label>
                <input
                  type="text"
                  value={newAsramaName}
                  onChange={(e) => setNewAsramaName(e.target.value)}
                  placeholder="Nama Asrama"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingAsrama ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Asrama
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {asramas.map((asrama) => (
              <tr key={asrama.id}>
                <td className="px-6 py-4 whitespace-nowrap">{asrama.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(asrama)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(asrama.id)}
                    className="text-red-600 hover:text-red-900 p-1 ml-2"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AsramaManagement;
