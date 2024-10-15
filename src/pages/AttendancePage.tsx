import React, { useState, useEffect } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { DayOfWeek, RosterEntry, Attendance } from '../types';
import AttendanceTable from '../components/AttendanceTable';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';
import DatePicker from '../components/DatePicker';

const AttendancePage: React.FC = () => {
  const { attendanceRecords, addOrUpdateAttendanceRecord } = useAttendance();
  const { roster } = useRoster();
  const { teachers } = useTeachers();
  const [currentDay, setCurrentDay] = useState<DayOfWeek | null>('Monday');
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
  const [absentDetails, setAbsentDetails] = useState<Array<{
    teacherName: string;
    date: string;
    hours: string;
    class: string;
    keterangan: string;
  }>>([]);
  
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
    const shouldSubmit = await confirm({
      title: 'Konfirmasi Pengiriman',
      message: 'Apakah Anda yakin ingin mengirim data kehadiran ini?',
      confirmText: 'Ya, Kirim',
      cancelText: 'Batal',
    });

    if (shouldSubmit) {
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
  
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);
  
      const filteredRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
  
      console.log('Filtered Records:', filteredRecords);
  
      const teacherAttendance: { [teacherId: string]: { hadir: number, tidakHadir: number } } = {};
      const absentDetailsTemp: typeof absentDetails = [];
  
      filteredRecords.forEach(record => {
        const rosterEntry = roster.find(r => r.id === record.rosterId);
        if (rosterEntry) {
          if (!teacherAttendance[rosterEntry.teacherId]) {
            teacherAttendance[rosterEntry.teacherId] = { hadir: 0, tidakHadir: 0 };
          }
          const scheduledHours = rosterEntry.hours.length;
          const presentHours = record.presentHours || [];
          teacherAttendance[rosterEntry.teacherId].hadir += presentHours.length;
          teacherAttendance[rosterEntry.teacherId].tidakHadir += scheduledHours - presentHours.length;
  
          // Add absent details
          const absentHours = rosterEntry.hours.filter(h => !presentHours.includes(h));
          if (absentHours.length > 0) {
            const teacher = teachers.find(t => t.id === rosterEntry.teacherId);
            absentDetailsTemp.push({
              teacherName: teacher?.name || 'Unknown',
              date: record.date,
              hours: absentHours.join(', '),
              class: rosterEntry.classId,
              keterangan: record.keterangan || ''
            });
          }
        }
      });
  
      setAbsentDetails(absentDetailsTemp);
  
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `Data Kehadiran ${type === 'custom' ? 'Kustom' : 'Bulanan'}\n`;
      csvContent += `Periode: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}\n\n`;
      csvContent += "No.,Nama Guru,Hadir,Tidak Hadir\n";
  
      Object.entries(teacherAttendance).forEach(([teacherId, attendance], index) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          csvContent += `${index + 1},${teacher.name},${attendance.hadir},${attendance.tidakHadir}\n`;
        }
      });
  
      // Add detailed absence information
      csvContent += "\nDetail Ketidakhadiran\n";
      csvContent += "Nama Guru,Tanggal,Jam Tidak Hadir,Kelas,Keterangan\n";
      absentDetailsTemp.forEach(detail => {
        csvContent += `${detail.teacherName},${detail.date},${detail.hours},${detail.class},${detail.keterangan}\n`;
      });
  
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `kehadiran_${type === 'custom' ? 'kustom' : 'bulanan'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      showAlert({ type: 'success', message: `Data kehadiran ${type === 'custom' ? 'kustom' : 'bulanan'} berhasil diekspor.` });
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
    <div className="space-y-8">
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
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Ekspor Data Kehadiran</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Ekspor Kustom</h3>
            <div className="flex flex-col space-y-2">
              <DatePicker
                label="Tanggal Mulai"
                selected={exportStartDate}
                onChange={handleExportStartDateChange}
              />
              <DatePicker
                label="Tanggal Akhir"
                selected={exportEndDate}
                onChange={handleExportEndDateChange}
              />
              <button
                onClick={() => handleExport('custom')}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ekspor Data Kustom
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Ekspor Bulanan</h3>
            <div className="flex flex-col space-y-2">
              <select
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
              <select
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
              <button
                onClick={() => handleExport('monthly')}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Ekspor Data Bulanan
              </button>
            </div>
          </div>
        </div>
      </div>
      {absentDetails.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Detail Ketidakhadiran</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jam Tidak Hadir
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {absentDetails.map((detail, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{detail.teacherName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.hours}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.class}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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