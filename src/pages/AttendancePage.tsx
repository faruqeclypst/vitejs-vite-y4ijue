import React, { useState, useEffect } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { useClasses } from '../contexts/ClassesContext';
import { DayOfWeek, RosterEntry, Attendance } from '../types';
import AttendanceTable from '../components/AttendanceTable';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';

const AttendancePage: React.FC = () => {
  const { attendanceRecords, addOrUpdateAttendanceRecord } = useAttendance();
  const { roster } = useRoster();
  const { teachers } = useTeachers();
  const { classes } = useClasses();
  const [currentDay, setCurrentDay] = useState<DayOfWeek | null>('Monday');
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).split(',')[0]
  );
  const [currentRoster, setCurrentRoster] = useState<RosterEntry[]>([]);
  const [filteredAttendanceRecords, setFilteredAttendanceRecords] = useState<Attendance[]>([]);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  
  useEffect(() => {
    updateDayFromDate(new Date(currentDate));
  }, [currentDate]);

  useEffect(() => {
    if (roster) {
      const filteredRoster = roster.filter(entry => entry.dayOfWeek === currentDay);
      setCurrentRoster(filteredRoster);
    }
  }, [roster, currentDay]);

  useEffect(() => {
    const filtered = attendanceRecords.filter(record => record.date === currentDate);
    setFilteredAttendanceRecords(filtered);
  }, [attendanceRecords, currentDate]);

  const updateDayFromDate = (date: Date) => {
    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    let dayIndex = jakartaDate.getDay() - 1;
    if (dayIndex === -1) {
      setCurrentDay(null);
    } else {
      const day = days[dayIndex];
      setCurrentDay(day);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCurrentDate(newDate);
  };

  const handleAttendanceSubmit = async (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => {
    try {
      Object.entries(attendanceData).forEach(([rosterId, data]) => {
        addOrUpdateAttendanceRecord({
          rosterId,
          date: currentDate,
          presentHours: data.presentHours,
          keterangan: data.keterangan
        });
      });
      showAlert({ type: 'success', message: 'Data kehadiran berhasil disimpan.' });
    } catch (error) {
      showAlert({ type: 'error', message: 'Gagal menyimpan data kehadiran. Silakan coba lagi.' });
      console.error('Error submitting attendance:', error);
    }
  };

  const handleExport = async (type: 'weekly' | 'monthly') => {
    const shouldExport = await confirm({
      title: 'Konfirmasi Ekspor',
      message: `Apakah Anda yakin ingin mengekspor data kehadiran ${type === 'weekly' ? 'mingguan' : 'bulanan'}?`,
      confirmText: 'Ekspor',
      cancelText: 'Batal',
    });

    if (shouldExport) {
      const currentSelectedDate = new Date(currentDate);
      const today = new Date();
      const startDate = new Date(currentSelectedDate);
      let endDate: Date;

      if (type === 'weekly') {
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
      } else {
        startDate.setDate(1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      }

      endDate = new Date(Math.min(endDate.getTime(), currentSelectedDate.getTime(), today.getTime()));

      const filteredRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });

      const teacherAttendance: { [teacherId: string]: { hadir: number, tidakHadir: number } } = {};

      filteredRecords.forEach(record => {
        const rosterEntry = roster.find(r => r.id === record.rosterId);
        if (rosterEntry) {
          if (!teacherAttendance[rosterEntry.teacherId]) {
            teacherAttendance[rosterEntry.teacherId] = { hadir: 0, tidakHadir: 0 };
          }
          const scheduledHours = rosterEntry.hours.length;
          teacherAttendance[rosterEntry.teacherId].hadir += record.presentHours.length;
          teacherAttendance[rosterEntry.teacherId].tidakHadir += scheduledHours - record.presentHours.length;
        }
      });

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `Data Kehadiran ${type === 'weekly' ? 'Mingguan' : 'Bulanan'}\n`;
      csvContent += `Periode: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}\n\n`;
      csvContent += "Nama Guru,Hadir,Tidak Hadir\n";

      Object.entries(teacherAttendance).forEach(([teacherId, attendance]) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          csvContent += `${teacher.name},${attendance.hadir},${attendance.tidakHadir}\n`;
        }
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `kehadiran_${type === 'weekly' ? 'mingguan' : 'bulanan'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showAlert({ type: 'success', message: `Data kehadiran ${type === 'weekly' ? 'mingguan' : 'bulanan'} berhasil diekspor.` });
    }
  };

  if (!roster || !teachers || !classes) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Halaman Kehadiran</h1>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Catat Kehadiran</h2>
          <span className="text-lg font-medium text-gray-600">
            {currentDay || 'Minggu'}
          </span>
        </div>
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date:</label>
            <input
              type="date"
              id="date"
              value={currentDate}
              onChange={handleDateChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('weekly')}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Export Mingguan
            </button>
            <button
              onClick={() => handleExport('monthly')}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Export Bulanan
            </button>
          </div>
        </div>
        {currentDay ? (
          currentRoster.length > 0 ? (
            <AttendanceTable
              roster={currentRoster}
              teachers={teachers}
              onSubmit={handleAttendanceSubmit}
              existingAttendance={filteredAttendanceRecords}
            />
          ) : (
            <p className="text-gray-500 italic">Tidak ada entri roster untuk hari ini.</p>
          )
        ) : (
          <p className="text-gray-500 italic">Tidak ada jadwal untuk hari Minggu.</p>
        )}
      </div>
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          duration={alert.duration}
          onClose={hideAlert}
        />
      )}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />
    </div>
  );
};

export default AttendancePage;