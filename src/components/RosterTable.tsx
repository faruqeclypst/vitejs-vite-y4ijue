import React, { useState } from 'react';
import { RosterEntry, Teacher } from '../types';
import RosterForm from './RosterForm';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

  const handleSubmit = (entry: Omit<RosterEntry, 'id'>) => {
    if (editingEntry) {
      onUpdate(editingEntry.id, entry);
    } else {
      onAdd(entry);
    }
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setEditingEntry(null);
          setIsModalOpen(true);
        }}
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Tambah Entri Baru
      </button>
      {Object.entries(groupedRoster).map(([teacherId, entries]) => {
        const teacher = teachers.find(t => t.id === teacherId);
        const isOpen = openTeachers.includes(teacherId);
        return (
          <div key={teacherId} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleTeacher(teacherId)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200"
            >
              <h3 className="font-bold text-lg">{teacher?.name}</h3>
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            {isOpen && (
              <div className="p-4 bg-white">
                {entries.map((entry) => (
                  <div key={entry.id} className="mb-2 p-2 bg-gray-50 rounded shadow">
                    <p><span className="font-semibold">{entry.dayOfWeek}:</span> {entry.classId}</p>
                    <p>Jam: {entry.hours.join(', ')}</p>
                    <div className="mt-2 space-x-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
        {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-smoke-light flex">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative p-8 bg-white w-full max-w-md m-auto flex-col flex rounded-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingEntry ? 'Edit Entri Jadwal' : 'Tambah Entri Jadwal Baru'}
            </h2>
            <RosterForm
              teachers={teachers}
              classes={classes}
              onSubmit={handleSubmit}
              initialData={editingEntry}
            />
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingEntry(null);
              }}
              className="mt-4 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterTable;