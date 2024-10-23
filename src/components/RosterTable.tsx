import React, { useState } from 'react';
import { RosterEntry, Teacher } from '../types';
import RosterForm from './RosterForm';
import { ChevronDown, ChevronUp, Edit, Trash2, Plus, X } from 'lucide-react';

interface RosterTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onDelete: (id: string) => void;
  onAdd: (entry: Omit<RosterEntry, 'id'>) => void;
  onUpdate: (id: string, entry: Omit<RosterEntry, 'id'>) => void;
  classes: string[];
}

const RosterTable: React.FC<RosterTableProps> = ({ roster, teachers, onDelete, onAdd, onUpdate, classes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openTeachers, setOpenTeachers] = useState<string[]>([]);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [addingForTeacher, setAddingForTeacher] = useState<string | null>(null);

  const groupedRoster = roster.reduce((acc, entry) => {
    if (!acc[entry.teacherId]) {
      acc[entry.teacherId] = [];
    }
    acc[entry.teacherId].push(entry);
    return acc;
  }, {} as Record<string, RosterEntry[]>);

  const toggleTeacher = (teacherId: string) => {
    setOpenTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleEdit = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleAddForTeacher = (teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the teacher row from toggling open/closed
    setAddingForTeacher(teacherId);
    setIsModalOpen(true);
  };

  const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const sortEntries = (a: RosterEntry, b: RosterEntry) => {
    const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.classId.localeCompare(b.classId);
  };

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Jadwal Guru</h2>

      {sortedTeachers.map((teacher) => {
        const entries = groupedRoster[teacher.id] || [];
        const isOpen = openTeachers.includes(teacher.id);
        const sortedEntries = entries.sort(sortEntries);
        return (
          <div key={teacher.id} className="border rounded-lg overflow-hidden mb-4">
            <div
              onClick={() => toggleTeacher(teacher.id)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 cursor-pointer"
            >
              <h3 className="font-bold text-lg">
                {teacher.name} <span className="text-sm font-normal text-gray-600">({teacher.code})</span>
              </h3>
              <div className="flex items-center">
                <button
                  onClick={(e) => handleAddForTeacher(teacher.id, e)}
                  className="mr-2 bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  <Plus size={16} />
                </button>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
            {isOpen && (
              <div className="p-4 bg-white">
                {sortedEntries.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedEntries.map((entry) => (
                      <div key={entry.id} className="p-2 bg-gray-50 rounded shadow">
                        <p><span className="font-semibold">{entry.dayOfWeek}:</span> {entry.classId}</p>
                        <p>Jam: {entry.hours.join(', ')}</p>
                        <div className="mt-2 space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-600"
                          >
                            <Edit size={12} className="inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(entry.id)}
                            className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                          >
                            <Trash2 size={12} className="inline mr-1" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Belum ada jadwal untuk guru ini.</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingEntry ? 'Edit Entri Jadwal' : 'Jadwal Baru'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEntry(null);
                  setAddingForTeacher(null);
                }}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <RosterForm
                teachers={teachers.map(teacher => ({
                  ...teacher,
                  name: `${teacher.name} (${teacher.code})`
                }))}
                classes={classes}
                onSubmit={(entry) => {
                  if (editingEntry) {
                    onUpdate(editingEntry.id, entry);
                  } else {
                    onAdd({ ...entry, teacherId: addingForTeacher! });
                  }
                  setIsModalOpen(false);
                  setEditingEntry(null);
                  setAddingForTeacher(null);
                }}
                initialData={editingEntry}
                preselectedTeacherId={addingForTeacher}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterTable;
