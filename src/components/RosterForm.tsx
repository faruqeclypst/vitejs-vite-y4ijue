import React, { useState } from 'react';
import { Teacher, DayOfWeek, daySchedule } from '../types';

interface RosterFormProps {
  teachers: Teacher[];
  classes: string[];
  onSubmit: (roster: { teacherId: string; classId: string; dayOfWeek: DayOfWeek; hours: number[] }) => void;
}

const RosterForm: React.FC<RosterFormProps> = ({ teachers, classes, onSubmit }) => {
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Monday');
  const [hours, setHours] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ teacherId, classId, dayOfWeek, hours });
    setHours([]);
  };

  const toggleHour = (hour: number) => {
    setHours(prev =>
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        className="w-full p-2 border rounded"
        required
      >
        <option value="">Select a teacher</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
        ))}
      </select>

      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full p-2 border rounded"
        required
      >
        <option value="">Select a class</option>
        {classes.map((cls) => (
          <option key={cls} value={cls}>{cls}</option>
        ))}
      </select>

      <select
        value={dayOfWeek}
        onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
        className="w-full p-2 border rounded"
        required
      >
        {Object.keys(daySchedule).map((day) => (
          <option key={day} value={day}>{day}</option>
        ))}
      </select>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Hours</label>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: daySchedule[dayOfWeek] }, (_, i) => i + 1).map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => toggleHour(hour)}
              className={`p-2 rounded ${
                hours.includes(hour) ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Hour {hour}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Add to Roster
      </button>
    </form>
  );
};

export default RosterForm;