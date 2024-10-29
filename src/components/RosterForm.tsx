import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    hours: [],
    createdAt: new Date().toISOString()
  });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const { roster } = useRoster();
  const [grade, setGrade] = useState<'X' | 'XI' | 'XII' | ''>('');

  const days = Object.keys(daySchedule) as DayOfWeek[];

  const [existingSchedules, setExistingSchedules] = useState<{
    teacherSchedules: RosterEntry[];
    classSchedules: RosterEntry[];
  }>({
    teacherSchedules: [],
    classSchedules: []
  });

  const updateExistingSchedules = useCallback(() => {
    if (formData.teacherId && formData.dayOfWeek && formData.classId) {
      const teacherSchedules = roster.filter(r => 
        r.teacherId === formData.teacherId && 
        r.dayOfWeek === formData.dayOfWeek &&
        r.id !== initialData?.id
      );

      const classSchedules = roster.filter(r => 
        r.classId === formData.classId && 
        r.dayOfWeek === formData.dayOfWeek &&
        r.id !== initialData?.id
      );

      setExistingSchedules({ teacherSchedules, classSchedules });
    }
  }, [formData.teacherId, formData.dayOfWeek, formData.classId, roster, initialData]);

  useEffect(() => {
    updateExistingSchedules();
  }, [updateExistingSchedules]);

  const isHourConflict = (hour: number) => {
    const teacherConflict = existingSchedules.teacherSchedules.some(schedule => 
      schedule.hours.includes(hour)
    );
    const classConflict = existingSchedules.classSchedules.some(schedule => 
      schedule.hours.includes(hour)
    );
    return teacherConflict || classConflict;
  };

  const getHourConflictDetails = (hour: number) => {
    const details = [];
    
    const teacherSchedule = existingSchedules.teacherSchedules.find(s => s.hours.includes(hour));
    if (teacherSchedule) {
      details.push(`Guru sudah mengajar kelas ${teacherSchedule.classId}`);
    }

    const classSchedule = existingSchedules.classSchedules.find(s => s.hours.includes(hour));
    if (classSchedule) {
      const teacher = teachers.find(t => t.id === classSchedule.teacherId);
      details.push(`Kelas sudah ada jadwal dengan ${teacher?.name || 'Unknown'}`);
    }

    return details.join(', ');
  };

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
    
    const submitData = {
      ...formData,
      createdAt: initialData?.createdAt || formData.createdAt
    };
    
    onSubmit(submitData);
    
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

  const handleDayChange = (day: DayOfWeek) => {
    setFormData(prev => ({
      ...prev,
      dayOfWeek: day,
      hours: [] // Reset jam saat hari berubah
    }));
  };

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
                onClick={() => handleDayChange(day)}
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
          {formData.teacherId && formData.dayOfWeek && formData.classId ? (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {formData.dayOfWeek && Array.from({ length: daySchedule[formData.dayOfWeek] }, (_, i) => i + 1).map((hour) => {
                  const isUpacara = formData.dayOfWeek === 'Senin' && hour === 1;
                  const hasConflict = isHourConflict(hour);
                  const conflictDetails = hasConflict ? getHourConflictDetails(hour) : '';
                  
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => !isUpacara && !hasConflict && toggleHour(hour)}
                      className={`p-2 rounded-md transition-colors relative group ${
                        isUpacara
                          ? 'bg-yellow-500 text-white cursor-not-allowed hover:bg-yellow-600'
                          : hasConflict
                          ? 'bg-red-100 text-red-700 border border-red-300 cursor-not-allowed'
                          : formData.hours.includes(hour)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={isUpacara || hasConflict}
                      title={isUpacara ? 'Jam Upacara' : `Jam Pelajaran ${hour}`}
                    >
                      {isUpacara ? 'JP 1' : `JP ${hour}`}
                      {/* Tooltip untuk konflik */}
                      {hasConflict && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                          {conflictDetails}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {existingSchedules.teacherSchedules.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium">Jadwal yang sudah ada:</p>
                  <ul className="list-disc list-inside">
                    {existingSchedules.teacherSchedules.map((schedule, idx) => (
                      <li key={idx}>
                        Kelas {schedule.classId}: JP {schedule.hours.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Pilih guru, hari, dan kelas terlebih dahulu untuk melihat jadwal yang tersedia
            </p>
          )}
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
