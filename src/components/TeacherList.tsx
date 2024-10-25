import React, { useState, useMemo } from 'react';
import { Teacher } from '../types';
import { Users, Edit, Trash2, Search, UserPlus } from 'lucide-react';
import TeacherForm from './TeacherForm'; // tambah import

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
  showModal: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onSubmit: (teacher: Omit<Teacher, 'id'>) => void;
  selectedTeacher: Teacher | null;
}

const TeacherList: React.FC<TeacherListProps> = ({ 
  teachers, 
  showModal,
  onOpenModal,
  onCloseModal,
  onSubmit,
  onEdit,
  onDelete,
  selectedTeacher 
}) => {
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
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={onCloseModal}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TeacherForm 
              onSubmit={onSubmit} 
              initialTeacher={selectedTeacher} 
              onClose={onCloseModal} 
            />
          </div>
        </div>
      )}

      <div className="space-y-4 bg-white rounded-lg shadow-sm p-3 sm:p-4">
        {/* Header with Search and Add */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari guru..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-8 border rounded-lg"
            />
            <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
          </div>
          <button
            onClick={onOpenModal}
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center"
          >
            <UserPlus size={20} className="mr-2" />
            <span>Tambah Guru</span>
          </button>
        </div>

        {/* Table/Card View */}
        <div className="overflow-x-auto">
          {/* Desktop View */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{teacher.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{teacher.code}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => onEdit(teacher)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(teacher.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="sm:hidden space-y-4">
            {filteredAndSortedTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{teacher.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Kode: {teacher.code}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => onEdit(teacher)}
                      className="p-3 text-blue-500 hover:bg-blue-50 rounded-full"
                    >
                      <Edit size={22} />
                    </button>
                    <button
                      onClick={() => onDelete(teacher.id)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredAndSortedTeachers.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada guru</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tidak ada hasil pencarian' : 'Mulai dengan menambahkan guru baru'}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default TeacherList;
