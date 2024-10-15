import React, { useState } from 'react';
import { RosterEntry, Teacher } from '../types';
import RosterForm from './RosterForm';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RosterTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onDelete: (id: string) => void;
  onAdd: (entry: Omit<RosterEntry, 'id'>) => void;
  classes: string[];
}

const RosterTable: React.FC<RosterTableProps> = ({ roster, teachers, onDelete, onAdd, classes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openTeachers, setOpenTeachers] = useState<string[]>([]);

  // Group roster entries by teacher
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

  return (
    <div className="overflow-x-auto">
      <button
        onClick={() => setIsModalOpen(true)}
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Add New Entry
      </button>
      <div className="space-y-2">
        {Object.entries(groupedRoster).map(([teacherId, entries]) => {
          const teacher = teachers.find(t => t.id === teacherId);
          const isOpen = openTeachers.includes(teacherId);
          return (
            <div key={teacherId} className="bg-white shadow rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTeacher(teacherId)}
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <h3 className="font-bold text-lg">{teacher?.name}</h3>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
              {isOpen && (
                <div className="p-4 bg-gray-50">
                  {entries.map((entry) => (
                    <div key={entry.id} className="mb-2 p-2 bg-white rounded shadow">
                      <p><span className="font-semibold">{entry.dayOfWeek}:</span> {entry.classId}</p>
                      <p>Hours: {entry.hours.join(', ')}</p>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="mt-2 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Roster Entry</h2>
            <RosterForm
              teachers={teachers}
              classes={classes}
              onSubmit={(entry) => {
                onAdd(entry);
                setIsModalOpen(false);
              }}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterTable;