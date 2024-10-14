import React from 'react';
import { RosterEntry, Teacher } from '../types';

interface RosterTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onDelete: (id: string) => void;
}

const RosterTable: React.FC<RosterTableProps> = ({ roster, teachers, onDelete }) => {
  // Group roster entries by teacher
  const groupedRoster = roster.reduce((acc, entry) => {
    if (!acc[entry.teacherId]) {
      acc[entry.teacherId] = [];
    }
    acc[entry.teacherId].push(entry);
    return acc;
  }, {} as Record<string, RosterEntry[]>);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">Teacher</th>
            <th className="py-3 px-6 text-left">Schedule</th>
            <th className="py-3 px-6 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm font-light">
          {Object.entries(groupedRoster).map(([teacherId, entries]) => {
            const teacher = teachers.find(t => t.id === teacherId);
            return (
              <tr key={teacherId} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">{teacher?.name}</td>
                <td className="py-3 px-6 text-left">
                  {entries.map((entry, index) => (
                    <div key={entry.id} className={index > 0 ? 'mt-2' : ''}>
                      <span className="font-semibold">{entry.dayOfWeek}:</span> {entry.classId} (Hours: {entry.hours.join(', ')})
                    </div>
                  ))}
                </td>
                <td className="py-3 px-6 text-center">
                  {entries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => onDelete(entry.id)}
                      className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-xs px-2 py-1 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                    >
                      Delete
                    </button>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RosterTable;