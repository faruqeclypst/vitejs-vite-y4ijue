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
    <div className="bg-white rounded-lg shadow-sm border">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex flex-col space-y-4">
          {/* Class Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-medium text-gray-900">{className}</h3>
              <p className="text-sm text-gray-500">Pilih jam pelajaran yang dihadiri</p>
            </div>
          </div>

          {/* Hours Grid - Responsive grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jam Pelajaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {rosterEntry.hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => toggleHour(hour)}
                  className={`p-2.5 text-sm rounded-lg transition-colors flex items-center justify-center ${
                    presentHours.includes(hour)
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  JP {hour}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Simpan Kehadiran
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AttendanceForm;
