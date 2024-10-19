import React, { useState, useEffect } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { useAuth } from '../contexts/AuthContext';
import { DayOfWeek, RosterEntry, Attendance } from '../types';
import AttendanceTable from '../components/AttendanceTable';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';
import { exportAttendance } from '../utils/exportAttendance';

const AttendancePage: React.FC = () => {
  const { attendanceRecords, addOrUpdateAttendanceRecord } = useAttendance();
  const { roster } = useRoster();
  const { teachers } = useTeachers();
  const { user } = useAuth();
  const [currentDay, setCurrentDay] = useState<DayOfWeek | null>('Senin');
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).split(',')[0]
  );
  const [currentRoster, setCurrentRoster] = useState<RosterEntry[]>([]);
  const [filteredAttendanceRecords, setFilteredAttendanceRecords] = useState<Attendance[]>([]);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [exportStartDate, setExportStartDate] = useState(new Date());
  const [exportEndDate, setExportEndDate] = useState(new Date());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [confirmedTeachers, setConfirmedTeachers] = useState<string[]>([]);

  const isAdmin = user?.role === 'admin'; 

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
    const days: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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
    if (isAdmin) {
      const newDate = e.target.value;
      setCurrentDate(newDate);
    }
  };

  const handleAttendanceSubmit = async (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => {
    const shouldSubmit = await confirm({
      title: 'Konfirmasi Pengiriman',
      message: 'Apakah Anda yakin ingin mengirim data kehadiran ini?',
      confirmText: 'Ya, Kirim',
      cancelText: 'Batal',
    });

    if (shouldSubmit) {
      try {
        const promises = Object.entries(attendanceData).map(([rosterId, data]) => 
          addOrUpdateAttendanceRecord({
            rosterId,
            date: currentDate,
            presentHours: data.presentHours,
            keterangan: data.keterangan
          })
        );

        await Promise.all(promises);

        const newConfirmedTeachers = [...new Set([...confirmedTeachers, ...Object.keys(attendanceData)])];
        setConfirmedTeachers(newConfirmedTeachers);

        showAlert({ type: 'success', message: 'Data kehadiran berhasil disimpan.' });
      } catch (error) {
        showAlert({ type: 'error', message: 'Gagal menyimpan data kehadiran. Silakan coba lagi.' });
        console.error('Error submitting attendance:', error);
      }
    }
  };

  const handleExport = async (type: 'custom' | 'monthly') => {
    const shouldExport = await confirm({
      title: 'Konfirmasi Ekspor',
      message: `Apakah Anda yakin ingin mengekspor data kehadiran ${type === 'custom' ? 'kustom' : 'bulanan'}?`,
      confirmText: 'Ekspor',
      cancelText: 'Batal',
    });
  
    if (shouldExport) {
      let startDate: Date, endDate: Date;
  
      if (type === 'custom') {
        startDate = new Date(exportStartDate);
        endDate = new Date(exportEndDate);
      } else {
        startDate = new Date(exportYear, exportMonth, 1);
        endDate = new Date(exportYear, exportMonth + 1, 0);
      }
  
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  
      const filteredRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
  
      try {
        await exportAttendance({
          startDate,
          endDate,
          attendanceRecords: filteredRecords,
          roster,
          teachers
        });
        showAlert({ type: 'success', message: `Data kehadiran ${type === 'custom' ? 'kustom' : 'bulanan'} berhasil diekspor.` });
      } catch (error) {
        console.error('Error exporting attendance:', error);
        showAlert({ type: 'error', message: 'Gagal mengekspor data kehadiran. Silakan coba lagi.' });
      }
    }
  };

  const handleExportStartDateChange = (date: Date | null) => {
    if (date) {
      setExportStartDate(date);
    }
  };

  const handleExportEndDateChange = (date: Date | null) => {
    if (date) {
      setExportEndDate(date);
    }
  };

  if (!roster || !teachers) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Halaman Kehadiran</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Catat Kehadiran</h2>
          <span className="text-lg font-medium text-gray-600">
            {currentDay || 'Minggu'}
          </span>
        </div>
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal:</label>
            <input
              type="date"
              id="date"
              value={currentDate}
              onChange={handleDateChange}
              disabled={!isAdmin}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
        </div>
        {currentDay ? (
          currentRoster.length > 0 ? (
            <AttendanceTable
              roster={currentRoster}
              teachers={teachers}
              onSubmit={handleAttendanceSubmit}
              existingAttendance={filteredAttendanceRecords}
              confirmedTeachers={confirmedTeachers}
            />
          ) : (
            <p className="text-gray-500 italic">Tidak ada entri roster untuk hari ini.</p>
          )
        ) : (
          <p className="text-gray-500 italic">Tidak ada jadwal untuk hari Minggu.</p>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Ekspor Data Kehadiran</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Ekspor Kustom</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    id="startDate"
                    value={exportStartDate.toISOString().split('T')[0]}
                    onChange={(e) => handleExportStartDateChange(new Date(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                  <input
                    type="date"
                    id="endDate"
                    value={exportEndDate.toISOString().split('T')[0]}
                    onChange={(e) => handleExportEndDateChange(new Date(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  />
                </div>
                <button
                  onClick={() => handleExport('custom')}
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ekspor Data Kustom
                </button>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Ekspor Bulanan</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                  <select
                    id="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                  <select
                    id="year"
                    value={exportYear}
                    onChange={(e) => setExportYear(parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleExport('monthly')}
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Ekspor Data Bulanan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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