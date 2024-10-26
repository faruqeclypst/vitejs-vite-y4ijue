import React, { useState, useEffect, useCallback } from 'react';
import { RosterEntry, Teacher, Attendance } from '../types';
import { Check } from 'lucide-react';

interface AttendanceTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onSubmit: (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => void;
  existingAttendance: Attendance[];
  confirmedTeachers: string[];
  currentDate: string;
  onDateChange: (date: string) => void;
  isAdmin: boolean;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  roster,
  teachers,
  onSubmit,
  existingAttendance,
  confirmedTeachers,
  currentDate,
  onDateChange,
  isAdmin,
}) => {
  const [attendanceData, setAttendanceData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});
  const [initialData, setInitialData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(e.target.value);
  };

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
      <div className="space-y-6">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal
          </label>
          <input
            type="date"
            value={currentDate}
            onChange={handleDateInputChange}
            disabled={!isAdmin}
            className="w-full sm:w-64 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Pesan tidak ada data */}
        <div className="text-center py-8 text-gray-500">
          Tidak ada data jadwal yang tersedia.
        </div>
      </div>
    );
  }

  // Filter roster untuk hanya menampilkan guru yang aktif
  const activeRoster = roster.filter(entry => {
    const teacher = teachers.find(t => t.id === entry.teacherId);
    return teacher && !teacher.isDeleted;
  });

  const groupedRoster = activeRoster.reduce((acc, entry) => {
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
      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tanggal
        </label>
        <input
          type="date"
          value={currentDate}
          onChange={handleDateInputChange}
          disabled={!isAdmin}
          className="w-full sm:w-64 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Nama Guru
              </th>
              {Array.from({ length: 8 }, (_, i) => (
                <th key={i} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  JP{i + 1}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTeacherIds.map((teacherId) => (
              <tr key={teacherId} className="hover:bg-gray-50">
                <td className="py-2 px-3 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {confirmedTeachers.includes(teacherId) && <Check className="text-green-500" size={16} />}
                    <span>{teachers.find(t => t.id === teacherId)?.name || 'Unknown'} ({teachers.find(t => t.id === teacherId)?.code || 'N/A'})</span>
                  </div>
                </td>
                {Array.from({ length: 8 }, (_, i) => (
                  <td key={i} className="py-2 px-3 text-center">
                    <div className="flex flex-col space-y-1">
                      {groupedRoster[teacherId].map(entry => {
                        if (entry.hours.includes(i + 1)) {
                          const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                          const isUpacara = entry.dayOfWeek === 'Senin' && i === 0;
                          return (
                            <button
                              key={entry.id}
                              onClick={() => !isUpacara && handleToggle(entry.id, i + 1)}
                              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                isUpacara
                                  ? 'bg-yellow-500 text-white cursor-not-allowed'
                                  : currentData.presentHours.includes(i + 1)
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              disabled={isUpacara}
                              title={isUpacara ? 'UPACARA' : undefined}
                            >
                              {isUpacara ? 'UPACARA' : entry.classId}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </td>
                ))}
                <td className="py-2 px-3">
                  {groupedRoster[teacherId].map(entry => {
                    const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                    return (
                      <div key={entry.id} className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium whitespace-nowrap">{entry.classId}:</span>
                        <input
                          type="text"
                          value={currentData.keterangan}
                          onChange={(e) => handleKeteranganChange(entry.id, e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Tambahkan keterangan..."
                        />
                      </div>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet View */}
      <div className="lg:hidden space-y-4">
        {sortedTeacherIds.map((teacherId) => {
          const entries = groupedRoster[teacherId];
          const teacher = teachers.find(t => t.id === teacherId);
          const isConfirmed = confirmedTeachers.includes(teacherId);

          return (
            <div key={teacherId} className="bg-white rounded-lg shadow-sm border">
              {/* Teacher Header */}
              <div className="p-4 border-b">
                <div className="flex items-center space-x-2">
                  {isConfirmed && <Check className="text-green-500" size={16} />}
                  <div>
                    <h3 className="font-medium text-gray-900">{teacher?.name}</h3>
                    <p className="text-sm text-gray-500">{teacher?.code}</p>
                  </div>
                </div>
              </div>

              {/* Hours Grid */}
              <div className="p-4 space-y-4">
                {entries.map(entry => {
                  const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                  return (
                    <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="mb-3">
                        <span className="font-medium text-sm text-gray-700">
                          Kelas: {entry.classId}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                        {entry.hours.map(hour => {
                          const isUpacara = entry.dayOfWeek === 'Senin' && hour === 1;
                          return (
                            <button
                              key={hour}
                              onClick={() => !isUpacara && handleToggle(entry.id, hour)}
                              className={`p-2.5 text-sm rounded-lg transition-colors ${
                                isUpacara
                                  ? 'bg-yellow-500 text-white cursor-not-allowed'
                                  : currentData.presentHours.includes(hour)
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              disabled={isUpacara}
                            >
                              {isUpacara ? 'UPACARA' : `JP ${hour}`}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={currentData.keterangan}
                        onChange={(e) => handleKeteranganChange(entry.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Tambahkan keterangan..."
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSubmit}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-colors ${
            hasUnsavedChanges
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
          disabled={!hasUnsavedChanges}
        >
          {hasUnsavedChanges ? 'Kirim Absensi' : 'Tidak Ada Perubahan'}
        </button>
      </div>
    </div>
  );
};

export default AttendanceTable;
