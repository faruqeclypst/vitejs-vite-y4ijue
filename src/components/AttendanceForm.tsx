import React, { useState } from 'react';
import { Teacher, RosterEntry } from '../types';

interface AttendanceFormProps {
  teacher: Teacher;
  className: string;
  rosterEntry: RosterEntry;
  onSubmit: (date: string, presentHours: number[]) => void;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ className, rosterEntry, onSubmit }) => {
  const [date] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presentHours, setPresentHours] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(date, presentHours);
    setPresentHours([]);
  };

  const toggleHour = (hour: number) => {
    setPresentHours(prev =>
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-4">
      <span className="font-medium text-gray-700">{className}:</span>
      <div className="flex-grow grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {rosterEntry.hours.map((hour) => (
          <button
            key={hour}
            type="button"
            onClick={() => toggleHour(hour)}
            className={`p-2 text-sm rounded-lg transition-colors ${
              presentHours.includes(hour)
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            JP {hour}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Submit
      </button>
    </form>
  );
};

export default AttendanceForm;
