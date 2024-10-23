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
    <div className="w-full">
      {/* Tombol tambah */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={openModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Asrama
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto">
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

      {/* Modal dengan ukuran lebih besar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingAsrama ? 'Edit Asrama' : 'Tambah Asrama Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Nama Asrama
                  </label>
                  <input
                    type="text"
                    value={newAsramaName}
                    onChange={(e) => setNewAsramaName(e.target.value)}
                    placeholder="Nama Asrama"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  >
                    {editingAsrama ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsramaManagement;
