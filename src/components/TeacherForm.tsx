import React, { useState } from 'react';
import { Teacher } from '../types';

interface TeacherFormProps {
  onSubmit: (teacher: Omit<Teacher, 'id'>) => void;
  initialTeacher?: Teacher;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ onSubmit, initialTeacher }) => {
  const [name, setName] = useState(initialTeacher?.name || '');
  const [code, setCode] = useState(initialTeacher?.code || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, code });
    setName('');
    setCode('');
  };

  return (
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
  );
};

export default TeacherForm;