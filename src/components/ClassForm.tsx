import React, { useState } from 'react';
import { Class } from '../types';

interface ClassFormProps {
  onSubmit: (classData: Omit<Class, 'id'>) => void;
  initialClass?: Class;
}

const ClassForm: React.FC<ClassFormProps> = ({ onSubmit, initialClass }) => {
  const [name, setName] = useState(initialClass?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name });
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Class Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          required
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        {initialClass ? 'Update Class' : 'Add Class'}
      </button>
    </form>
  );
};

export default ClassForm;