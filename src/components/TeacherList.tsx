import React, { useState, useMemo } from 'react';
import { Teacher } from '../types';
import { Users, Edit, Trash2, Search, UserPlus } from 'lucide-react';

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const TeacherList: React.FC<TeacherListProps> = ({ teachers, onEdit, onDelete, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedTeachers = useMemo(() => {
    return teachers
      .filter(teacher =>
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, searchTerm]);

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Users className="mr-2" />
          Guru
        </h2>
        <button
          onClick={onAdd}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          <UserPlus size={20} />
        </button>
      </div>
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
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Nama</th>
              <th className="px-4 py-2 text-left">Kode</th>
              <th className="px-4 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTeachers.map((teacher) => (
              <tr key={teacher.id} className="border-b">
                <td className="px-4 py-2">{teacher.name}</td>
                <td className="px-4 py-2">{teacher.code}</td>
                <td className="px-4 py-2 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredAndSortedTeachers.length === 0 && (
        <p className="text-center text-gray-500 mt-4">Tidak ada guru yang ditemukan.</p>
      )}
    </div>
  );
};

export default TeacherList;