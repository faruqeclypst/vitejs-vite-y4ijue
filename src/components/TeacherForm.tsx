import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { X } from 'lucide-react';

interface TeacherFormProps {
  onSubmit: (teacher: Omit<Teacher, 'id'>) => void;
  initialTeacher?: Teacher | null;
  onClose: () => void;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ onSubmit, initialTeacher, onClose }) => {
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
    <div className="bg-white w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {initialTeacher ? 'Edit Guru' : 'Tambah Guru'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
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

          <button
            type="submit"
            className="w-full p-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            {initialTeacher ? 'Perbarui Guru' : 'Tambah Guru'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeacherForm;
