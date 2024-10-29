import React, { useState, useMemo, Suspense } from 'react';
import { Teacher } from '../types';
import { Users, Edit, Trash2, Search, UserPlus, History } from 'lucide-react';
import TeacherForm from './TeacherForm';
import LoadingSpinner from './common/LoadingSpinner';

type TabType = 'active' | 'deleted';

interface TeacherListProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onDeletePermanent: (id: string) => void;
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
  onRestore,
  onDeletePermanent,
  selectedTeacher 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('active');
  
  const filteredAndSortedTeachers = useMemo(() => {
    return teachers
      .filter(teacher => {
        const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'active' ? !teacher.isDeleted : teacher.isDeleted;
        return matchesSearch && matchesTab;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, searchTerm, activeTab]);

  return (
    <>
      {showModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <TeacherForm 
            isOpen={showModal}
            onClose={onCloseModal}
            onSubmit={onSubmit}
            initialTeacher={selectedTeacher}
          />
        </Suspense>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-8 border rounded-lg"
              />
              <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
            </div>
            {/* Tabs untuk desktop */}
            <div className="hidden sm:flex space-x-1">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'active'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Aktif
              </button>
              <button
                onClick={() => setActiveTab('deleted')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'deleted'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Terhapus
              </button>
            </div>
          </div>
          <button
            onClick={onOpenModal}
            className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <UserPlus size={18} />
            <span>Tambah Guru</span>
          </button>
        </div>

        {/* Tabs untuk mobile */}
        <div className="sm:hidden">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'active'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'deleted'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Terhapus
            </button>
          </nav>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="p-4 rounded-lg bg-white shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{teacher.name}</p>
                  <p className="text-sm text-gray-500">{teacher.code}</p>
                </div>
                <div className="flex space-x-2">
                  {activeTab === 'active' ? (
                    <>
                      <button
                        onClick={() => onEdit(teacher)}
                        className="p-1 hover:bg-blue-50 rounded text-blue-600"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(teacher.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onRestore(teacher.id)}
                        className="p-1 hover:bg-green-50 rounded text-green-600"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => onDeletePermanent(teacher.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedTeachers.length === 0 && (
          <div className="text-center py-12">
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
