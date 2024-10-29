import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, DayOfWeek, daySchedule, RosterEntry } from '../types';
import { useRoster } from '../contexts/RosterContext';
import Modal from './Modal';

interface RosterFormProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: string[];
  onSubmit: (entry: Omit<RosterEntry, 'id'>) => void;
  initialData?: RosterEntry | null;
  preselectedTeacherId?: string | null;
}

interface Conflict {
  hour: number;
  conflictType: 'class' | 'teacher';
  conflictWith: string;
}

const RosterForm: React.FC<RosterFormProps> = ({ 
  isOpen, 
  onClose, 
  teachers, 
  classes, 
  onSubmit, 
  initialData, 
  preselectedTeacherId
}) => {
  const [formData, setFormData] = useState<Omit<RosterEntry, 'id'>>({
    teacherId: preselectedTeacherId || '',
    dayOfWeek: 'Senin',
    classId: classes[0],
    hours: []
  });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const { roster } = useRoster();
  const [grade, setGrade] = useState<'X' | 'XI' | 'XII' | ''>('');

  const days = Object.keys(daySchedule) as DayOfWeek[];

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (preselectedTeacherId) {
      setFormData(prev => ({
        ...prev,
        teacherId: preselectedTeacherId
      }));
    }
  }, [initialData, preselectedTeacherId]);

  useEffect(() => {
    if(formData.dayOfWeek) {
      checkConflicts();
    }
  }, [formData.teacherId, formData.classId, formData.dayOfWeek, formData.hours, roster]);

  const checkConflicts = () => {
    const newConflicts: Conflict[] = [];
    
    formData.hours.forEach(hour => {
      const conflictingEntries = roster.filter(
        entry => (
          entry.dayOfWeek === formData.dayOfWeek &&
          entry.hours.includes(hour) &&
          entry.id !== initialData?.id
        )
      );

      conflictingEntries.forEach(entry => {
        if (entry.classId === formData.classId) {
          newConflicts.push({
            hour,
            conflictType: 'class',
            conflictWith: teachers.find(t => t.id === entry.teacherId)?.name || 'Unknown Teacher'
          });
        }
        if (entry.teacherId === formData.teacherId) {
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
    if (!formData.dayOfWeek) {
      alert('Harap pilih hari.');
      return;
    }
    onSubmit(formData);
    if (!initialData) {
      setFormData(prev => ({
        ...prev,
        hours: []
      }));
    }
    onClose();
  };

  const toggleHour = (hour: number) => {
    if (formData.dayOfWeek === 'Senin' && hour === 1) return; // Prevent toggling first hour on Monday
    setFormData(prev => ({
      ...prev,
      hours: prev.hours.includes(hour) ? prev.hours.filter(h => h !== hour) : [...prev.hours, hour]
    }));
  };

  const getConflictMessage = () => {
    if (conflicts.length === 0) return '';

    const conflictHours = [...new Set(conflicts.map(c => c.hour))].sort((a, b) => a - b).join(', ');
    const classConflicts = conflicts.filter(c => c.conflictType === 'class');
    const teacherConflicts = conflicts.filter(c => c.conflictType === 'teacher');
    
    let message = `Konflik jadwal pada jam ${conflictHours}: `;
    
    if (classConflicts.length > 0) {
      const conflictingTeachers = [...new Set(classConflicts.map(c => c.conflictWith))].join(', ');
      message += `Kelas ${formData.classId} sudah ada jadwal dengan ${conflictingTeachers}. `;
    }
    
    if (teacherConflicts.length > 0) {
      const conflictingClasses = [...new Set(teacherConflicts.map(c => c.conflictWith))].join(', ');
      const teacherName = teachers.find(t => t.id === formData.teacherId)?.name || 'Unknown Teacher';
      message += `${teacherName} sudah mengajar kelas ${conflictingClasses}.`;
    }
    
    return message.trim();
  };

  const gradeOptions = ['X', 'XI', 'XII'];
  const filteredClasses = grade 
    ? classes.filter(cls => new RegExp(`^${grade}-\\d+$`).test(cls))
    : [];

  const isFormValid = useMemo(() => {
    return (
      formData.teacherId && 
      formData.dayOfWeek && 
      formData.classId && 
      formData.hours.length > 0 // Pastikan minimal 1 jam dipilih
    );
  }, [formData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Jadwal' : 'Tambah Jadwal'}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guru</label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              disabled={!!preselectedTeacherId}
              className={`w-full p-2 border rounded-lg ${
                preselectedTeacherId ? 'bg-gray-100' : ''
              }`}
              required
            >
              <option value="">Pilih Guru</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tingkatan Kelas</label>
            <div className="grid grid-cols-3 gap-2">
              {gradeOptions.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g as "X" | "XI" | "XII")}
                  className={`py-2 px-3 text-sm rounded-md ${
                    grade === g 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {grade && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
            <div className="grid grid-cols-3 gap-2">
              {filteredClasses.map((cls) => (
                <button
                  key={cls}
                  type="button" 
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    classId: cls
                  }))}
                  className={`p-2 text-sm rounded-md ${
                    formData.classId === cls 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hari</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  dayOfWeek: day
                }))}
                className={`p-2 rounded-md transition-colors ${
                  formData.dayOfWeek === day 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jam Pelajaran</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {formData.dayOfWeek && Array.from({ length: daySchedule[formData.dayOfWeek] }, (_, i) => i + 1).map((hour) => {
              const isUpacara = formData.dayOfWeek === 'Senin' && hour === 1;
              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => toggleHour(hour)}
                  className={`p-2 rounded-md transition-colors ${
                    isUpacara
                      ? 'bg-yellow-500 text-white cursor-not-allowed hover:bg-yellow-600'
                      : formData.hours.includes(hour)
                      ? conflicts.some(c => c.hour === hour)
                        ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isUpacara}
                  title={isUpacara ? 'Jam Upacara' : `Jam Pelajaran ${hour}`}
                >
                  {isUpacara ? 'JP 1' : `JP ${hour}`}
                </button>
              );
            })}
          </div>
        </div>

        {conflicts.length > 0 && (
          <p className="text-red-500 font-bold">
            {getConflictMessage()}
          </p>
        )}

        {formData.hours.length === 0 && (
          <p className="text-red-500 text-sm">
            Pilih minimal satu jam pelajaran
          </p>
        )}

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
            disabled={!isFormValid || conflicts.length > 0}
            className={`px-4 py-2 text-white rounded-lg ${
              !isFormValid || conflicts.length > 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {initialData ? 'Update' : 'Simpan'}
          </button>
        </div>

        {!isFormValid && (
          <p className="text-red-500 text-sm text-center">
            {!formData.teacherId ? 'Pilih guru' : 
             !formData.dayOfWeek ? 'Pilih hari' :
             !formData.classId ? 'Pilih kelas' :
             !formData.hours.length ? 'Pilih minimal satu jam pelajaran' : ''}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default RosterForm;
