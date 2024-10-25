import React, { useState, useEffect, useCallback } from 'react';
import { RosterEntry, Teacher, Attendance } from '../types';
import { Check } from 'lucide-react';

interface AttendanceTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onSubmit: (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => void;
  existingAttendance: Attendance[];
  confirmedTeachers: string[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  roster,
  teachers,
  onSubmit,
  existingAttendance,
  confirmedTeachers,
}) => {
  const [attendanceData, setAttendanceData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});
  const [initialData, setInitialData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const initialData: { [rosterId: string]: { presentHours: number[], keterangan: string } } = {};
    roster.forEach(entry => {
      const existingRecord = existingAttendance.find(record => record.rosterId === entry.id);
      initialData[entry.id] = existingRecord
        ? { presentHours: existingRecord.presentHours || [], keterangan: existingRecord.keterangan || '' }
        : { presentHours: [], keterangan: '' };
    });
    setAttendanceData(initialData);
    setInitialData(initialData);
    setHasUnsavedChanges(false);
  }, [roster, existingAttendance]);

  const checkForChanges = useCallback(() => {
    const hasChanges = Object.keys(attendanceData).some(rosterId => {
      const current = attendanceData[rosterId];
      const initial = initialData[rosterId];
      if (!initial) return false;
      return current.presentHours.length !== initial.presentHours.length ||
        current.presentHours.some(hour => !initial.presentHours.includes(hour)) ||
        current.keterangan !== initial.keterangan;
    });
    setHasUnsavedChanges(hasChanges);
  }, [attendanceData, initialData]);

  const handleToggle = (rosterId: string, hour: number) => {
    setAttendanceData(prev => {
      const current = prev[rosterId] || { presentHours: [], keterangan: '' };
      const updatedHours = current.presentHours.includes(hour)
        ? current.presentHours.filter(h => h !== hour)
        : [...current.presentHours, hour].sort((a, b) => a - b);
      return {
        ...prev,
        [rosterId]: {
          ...current,
          presentHours: updatedHours,
        }
      };
    });
  };

  const handleKeteranganChange = (rosterId: string, keterangan: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [rosterId]: { ...prev[rosterId], keterangan }
    }));
  };

  useEffect(() => {
    checkForChanges();
  }, [attendanceData, checkForChanges]);

  const handleSubmit = () => {
    onSubmit(attendanceData);
    setInitialData(attendanceData);
    setHasUnsavedChanges(false);
  };

  if (!roster.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        Tidak ada data jadwal yang tersedia.
      </div>
    );
  }

  const groupedRoster = roster.reduce((acc, entry) => {
    const teacherId = entry.teacherId;
    if (!acc[teacherId]) {
      acc[teacherId] = [];
    }
    acc[teacherId].push(entry);
    return acc;
  }, {} as { [teacherId: string]: RosterEntry[] });

  // Sort teachers alphabetically by name
  const sortedTeacherIds = Object.keys(groupedRoster).sort((a, b) => {
    const teacherA = teachers.find(t => t.id === a);
    const teacherB = teachers.find(t => t.id === b);
    return (teacherA?.name || '').localeCompare(teacherB?.name || '');
  });

  return (
    <div className="space-y-6">
      {/* Desktop View */}
      <div className="hidden sm:block space-y-4">
        {sortedTeacherIds.map((teacherId) => {
          const entries = groupedRoster[teacherId];
          const teacher = teachers.find(t => t.id === teacherId);
          const isConfirmed = confirmedTeachers.includes(teacherId);

          return (
            <div key={teacherId} className="bg-white rounded-lg shadow p-4">
              {/* Teacher Header */}
              <div className="flex items-center space-x-2 border-b pb-3 mb-4">
                {isConfirmed && <Check className="text-green-500" size={16} />}
                <h3 className="font-medium text-gray-800">
                  {teacher?.name || 'Unknown'} ({teacher?.code || 'N/A'})
                </h3>
              </div>

              {/* Class Entries */}
              <div className="space-y-6">
                {entries.map(entry => {
                  const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                  
                  return (
                    <div key={entry.id} className="border rounded-lg p-4">
                      {/* Class Name */}
                      <div className="font-medium text-gray-700 mb-3">
                        Kelas: {entry.classId}
                      </div>

                      {/* Hours Grid */}
                      <div className="grid grid-cols-8 gap-3 mb-3">
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(hour => {
                          const isScheduled = entry.hours.includes(hour);
                          const isUpacara = entry.dayOfWeek === 'Senin' && hour === 1;

                          if (!isScheduled) return (
                            <div key={hour} className="p-2 text-sm text-gray-400 bg-gray-100 rounded-lg text-center">
                              JP {hour}
                            </div>
                          );

                          return (
                            <button
                              key={hour}
                              onClick={() => !isUpacara && handleToggle(entry.id, hour)}
                              className={`p-3 text-sm rounded-lg transition-colors ${
                                isUpacara
                                  ? 'bg-yellow-500 text-white cursor-not-allowed'
                                  : currentData.presentHours.includes(hour)
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              disabled={isUpacara}
                            >
                              {isUpacara ? 'UPACARA' : `JP ${hour}`}
                            </button>
                          );
                        })}
                      </div>

                      {/* Keterangan */}
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700">Keterangan:</label>
                        <input
                          type="text"
                          value={currentData.keterangan}
                          onChange={(e) => handleKeteranganChange(entry.id, e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Tambahkan keterangan..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile View */}
      <div className="sm:hidden space-y-4">
        {sortedTeacherIds.map((teacherId) => {
          const entries = groupedRoster[teacherId];
          const teacher = teachers.find(t => t.id === teacherId);
          const isConfirmed = confirmedTeachers.includes(teacherId);

          return (
            <div key={teacherId} className="bg-white rounded-lg shadow p-3">
              {/* Teacher Header */}
              <div className="flex items-center space-x-2 border-b pb-2 mb-3">
                {isConfirmed && <Check className="text-green-500" size={16} />}
                <h3 className="font-medium text-gray-800">
                  {teacher?.name || 'Unknown'} ({teacher?.code || 'N/A'})
                </h3>
              </div>

              {/* Class Entries */}
              <div className="space-y-4">
                {entries.map(entry => {
                  const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                  
                  return (
                    <div key={entry.id} className="border rounded-lg p-2">
                      {/* Class Name */}
                      <div className="font-medium text-sm text-gray-700 mb-2">
                        Kelas: {entry.classId}
                      </div>

                      {/* Hours Grid */}
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(hour => {
                          const isScheduled = entry.hours.includes(hour);
                          const isUpacara = entry.dayOfWeek === 'Senin' && hour === 1;

                          if (!isScheduled) return (
                            <div key={hour} className="p-2 text-xs text-gray-400 bg-gray-100 rounded-lg text-center">
                              JP {hour}
                            </div>
                          );

                          return (
                            <button
                              key={hour}
                              onClick={() => !isUpacara && handleToggle(entry.id, hour)}
                              className={`p-2 text-xs rounded-lg transition-colors ${
                                isUpacara
                                  ? 'bg-yellow-500 text-white cursor-not-allowed'
                                  : currentData.presentHours.includes(hour)
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              disabled={isUpacara}
                            >
                              {isUpacara ? 'UPACARA' : `JP ${hour}`}
                            </button>
                          );
                        })}
                      </div>

                      {/* Keterangan */}
                      <input
                        type="text"
                        value={currentData.keterangan}
                        onChange={(e) => handleKeteranganChange(entry.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Keterangan..."
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${
          hasUnsavedChanges
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-gray-400 text-white cursor-not-allowed'
        }`}
        disabled={!hasUnsavedChanges}
      >
        {hasUnsavedChanges ? 'Kirim Absensi' : 'Tidak Ada Perubahan'}
      </button>
    </div>
  );
};

export default AttendanceTable;
