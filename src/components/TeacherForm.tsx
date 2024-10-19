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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialTeacher ? 'Edit Guru' : 'Tambah Guru'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teacher Name"
            required
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kode Guru"
            required
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            {initialTeacher ? 'Update Teacher' : 'Add Teacher'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeacherForm;