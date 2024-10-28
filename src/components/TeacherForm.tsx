import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import Modal from './Modal';

interface TeacherFormProps {
  onSubmit: (teacher: Omit<Teacher, 'id'>) => void;
  initialTeacher?: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ 
  onSubmit, 
  initialTeacher, 
  isOpen,
  onClose 
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (initialTeacher) {
      setName(initialTeacher.name);
      setCode(initialTeacher.code);
    } else {
      setName('');
      setCode('');
    }
  }, [initialTeacher]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, code });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTeacher ? 'Edit Guru' : 'Tambah Guru'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Guru</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2.5 text-sm border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kode Guru</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full p-2.5 text-sm border rounded-md"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {initialTeacher ? 'Update' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TeacherForm;
