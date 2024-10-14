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
      <div>
        <label htmlFor="teacher" className="block text-sm font-medium text-gray-700">
          Teacher
        </label>
        <select
          id="teacher"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          required
        >
          <option value="">Select a teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="class" className="block text-sm font-medium text-gray-700">
          Class
        </label>
        <select
          id="class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          required
        >
          <option value="">Select a class</option>
          {classes.map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700">
          Day of Week
        </label>
        <select
          id="dayOfWeek"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          required
        >
          {Object.keys(daySchedule).map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Hours</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {Array.from({ length: daySchedule[dayOfWeek] }, (_, i) => i + 1).map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => toggleHour(hour)}
              className={`p-2 rounded ${
                hours.includes(hour) ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Hour {hour}
            </button>
          ))}
        </div>
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Add to Roster
      </button>
    </form>
  );
};

export default RosterForm;