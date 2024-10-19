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
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <span className="font-medium">{className}:</span>
      <div className="flex-grow grid grid-cols-8 gap-1">
        {rosterEntry.hours.map((hour) => (
          <button
            key={hour}
            type="button"
            onClick={() => toggleHour(hour)}
            className={`p-1 text-xs rounded ${
              presentHours.includes(hour) ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            {hour}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
};

export default AttendanceForm;