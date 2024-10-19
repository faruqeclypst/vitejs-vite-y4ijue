import React, { useState, useEffect } from 'react';
import { Teacher, DayOfWeek, daySchedule, RosterEntry } from '../types';
import { useRoster } from '../contexts/RosterContext';

interface RosterFormProps {
  teachers: Teacher[];
  classes: string[];
  onSubmit: (roster: Omit<RosterEntry, 'id'>) => void;
  initialData?: RosterEntry | null;
}

interface Conflict {
  hour: number;
  conflictType: 'class' | 'teacher';
  conflictWith: string;
}

const RosterForm: React.FC<RosterFormProps> = ({ teachers, classes, onSubmit, initialData }) => {
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | ''>('');
  const [hours, setHours] = useState<number[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const { roster } = useRoster();

  useEffect(() => {
    if (initialData) {
      setTeacherId(initialData.teacherId);
      setClassId(initialData.classId);
      setDayOfWeek(initialData.dayOfWeek);
      setHours(initialData.hours);
    }
  }, [initialData]);

  useEffect(() => {
    if(dayOfWeek) {
      checkConflicts();
    }
  }, [teacherId, classId, dayOfWeek, hours, roster]);

  const checkConflicts = () => {
    const newConflicts: Conflict[] = [];
    
    hours.forEach(hour => {
      const conflictingEntries = roster.filter(
        entry => (
          entry.dayOfWeek === dayOfWeek &&
          entry.hours.includes(hour) &&
          entry.id !== initialData?.id
        )
      );

      conflictingEntries.forEach(entry => {
        if (entry.classId === classId) {
          newConflicts.push({
            hour,
            conflictType: 'class',
            conflictWith: teachers.find(t => t.id === entry.teacherId)?.name || 'Unknown Teacher'
          });
        }
        if (entry.teacherId === teacherId) {
          newConflicts.push({
            hour,
            conflictType: 'teacher',
            conflictWith: entry.classId
          });
        }
      });
    });

    setConflicts(newConflicts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflicts.length > 0) {
      alert('Tidak dapat menyimpan jadwal karena ada konflik. Harap selesaikan konflik terlebih dahulu.');
      return;
    }
    if (dayOfWeek === '') {
      alert('Harap pilih hari.');
      return;
    }
    onSubmit({ teacherId, classId, dayOfWeek: dayOfWeek as DayOfWeek, hours });
    if (!initialData) {
      setHours([]);
    }
  };

  const toggleHour = (hour: number) => {
    setHours(prev =>
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]
    );
  };

  const getConflictMessage = () => {
    if (conflicts.length === 0) return '';

    const conflictHours = [...new Set(conflicts.map(c => c.hour))].sort((a, b) => a - b).join(', ');
    const classConflicts = conflicts.filter(c => c.conflictType === 'class');
    const teacherConflicts = conflicts.filter(c => c.conflictType === 'teacher');
    
    let message = `Konflik jadwal pada jam ${conflictHours}: `;
    
    if (classConflicts.length > 0) {
      const conflictingTeachers = [...new Set(classConflicts.map(c => c.conflictWith))].join(', ');
      message += `Kelas ${classId} sudah ada jadwal dengan ${conflictingTeachers}. `;
    }
    
    if (teacherConflicts.length > 0) {
      const conflictingClasses = [...new Set(teacherConflicts.map(c => c.conflictWith))].join(', ');
      const teacherName = teachers.find(t => t.id === teacherId)?.name || 'Unknown Teacher';
      message += `${teacherName} sudah mengajar kelas ${conflictingClasses}.`;
    }
    
    return message.trim();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        className="w-full p-2 border rounded"
        required
      >
        <option value="">Pilih guru</option>
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
        <option value="">Pilih kelas</option>
        {classes.map((cls) => (
          <option key={cls} value={cls}>{cls}</option>
        ))}
      </select>

      <select
        value={dayOfWeek}
        onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek || '')}
        className="w-full p-2 border rounded"
        required
      >
        <option value="">Pilih hari</option>
        {Object.keys(daySchedule).map((day) => (
          <option key={day} value={day}>{day}</option>
        ))}
      </select>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Jam</label>
        <div className="grid grid-cols-4 gap-2">
          {dayOfWeek && Array.from({ length: daySchedule[dayOfWeek] }, (_, i) => i + 1).map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => toggleHour(hour)}
              className={`p-2 rounded ${
                hours.includes(hour)
                  ? conflicts.some(c => c.hour === hour)
                    ? 'bg-red-500 text-white'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Jam {hour}
            </button>
          ))}
        </div>
      </div>

      {conflicts.length > 0 && (
        <p className="text-red-500 font-bold">
          {getConflictMessage()}
        </p>
      )}

      <button
        type="submit"
        className={`w-full p-2 text-white rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
          conflicts.length > 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
        }`}
        disabled={conflicts.length > 0}
      >
        {initialData ? 'Perbarui Jadwal' : 'Tambah ke Jadwal'}
      </button>
    </form>
  );
};

export default RosterForm;