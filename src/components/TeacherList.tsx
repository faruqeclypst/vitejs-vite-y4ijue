import React, { useState } from 'react';
import { Teacher } from '../types';
import { Users, Edit, Trash2, Search } from 'lucide-react';

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
}

const TeacherList: React.FC<TeacherListProps> = ({ teachers, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Users className="mr-2" />
        Guru
      </h2>
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Cari guru..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-8 border rounded"
        />
        <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
      </div>
      <ul className="space-y-2">
        {filteredTeachers.map((teacher) => (
          <li
            key={teacher.id}
            className="p-2 rounded bg-gray-100 flex justify-between items-center"
          >
            <span>{teacher.name} ({teacher.code})</span>
            <div>
              <button
                onClick={() => onEdit(teacher)}
                className="text-blue-500 hover:text-blue-700 mr-2"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => onDelete(teacher.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {filteredTeachers.length === 0 && (
        <p className="text-center text-gray-500 mt-4">Tidak ada guru yang ditemukan.</p>
      )}
    </div>
  );
};

export default TeacherList;