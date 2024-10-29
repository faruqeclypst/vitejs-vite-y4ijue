import React, { useState } from 'react';
import { Teacher, RosterEntry } from '../types';
import Modal from './Modal';
import { useRoster } from '../contexts/RosterContext';

interface AttendanceFormProps {
  teacher: Teacher;
  className: string;
  rosterEntry: RosterEntry;
  onSubmit: (date: string, presentHours: number[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ 
  className, 
  rosterEntry, 
  onSubmit,
  isOpen,
  onClose
}) => {
  const [date] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presentHours, setPresentHours] = useState<number[]>([]);
  const { getEffectiveRoster } = useRoster();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(date, presentHours);
    setPresentHours([]);
    onClose();
  };

  const effectiveRoster = getEffectiveRoster(rosterEntry.id, date);
  const effectiveHours = effectiveRoster?.hours || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Input Kehadiran - ${className}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jam Kehadiran
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {effectiveHours.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => {
                  setPresentHours(prev =>
                    prev.includes(hour)
                      ? prev.filter(h => h !== hour)
                      : [...prev, hour]
                  );
                }}
                className={`p-2 rounded-lg transition-colors ${
                  presentHours.includes(hour)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                JP {hour}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Simpan
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AttendanceForm;
