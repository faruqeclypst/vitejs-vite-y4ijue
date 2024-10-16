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
import { utils, writeFile, WorkBook, WorkSheet } from 'xlsx';

const AttendancePage: React.FC = () => {
  const { attendanceRecords, addOrUpdateAttendanceRecord } = useAttendance();
  const { roster } = useRoster();
  const { teachers } = useTeachers();
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
        const promises = Object.entries(attendanceData).map(([rosterId, data]) => 
          addOrUpdateAttendanceRecord({
            rosterId,
            date: currentDate,
            presentHours: data.presentHours,
            keterangan: data.keterangan
          })
        );

        await Promise.all(promises);

        // Update confirmed teachers
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
  
      const teacherAttendance: { [teacherId: string]: { hadir: number, tidakHadir: number } } = {};
      const absentDetailsTemp: {
        [teacherId: string]: {
          teacherName: string;
          teacherCode: string;
          absences: Array<{
            date: string;
            absentHours: number;
            class: string;
            keterangan: string;
          }>;
        };
      } = {};
      
      filteredRecords.forEach(record => {
        const rosterEntry = roster.find(r => r.id === record.rosterId);
        if (rosterEntry) {
          const teacherId = rosterEntry.teacherId;
          const teacher = teachers.find(t => t.id === teacherId);
          if (!teacherAttendance[teacherId]) {
            teacherAttendance[teacherId] = { hadir: 0, tidakHadir: 0 };
          }
          if (!absentDetailsTemp[teacherId]) {
            absentDetailsTemp[teacherId] = {
              teacherName: teacher?.name || 'Unknown',
              teacherCode: teacher?.code || 'N/A',
              absences: []
            };
          }
          
          const scheduledHours = rosterEntry.hours.length;
          const presentHours = record.presentHours || [];
          teacherAttendance[teacherId].hadir += presentHours.length;
          teacherAttendance[teacherId].tidakHadir += scheduledHours - presentHours.length;
  
          // Add absent details
          const absentHours = rosterEntry.hours.filter(h => !presentHours.includes(h));
          if (absentHours.length > 0) {
            absentDetailsTemp[teacherId].absences.push({
              date: record.date,
              absentHours: absentHours.length,
              class: rosterEntry.classId,
              keterangan: record.keterangan || ''
            });
          }
        }
      });
  
      // Create a new workbook
      const wb: WorkBook = utils.book_new();

      // Helper function to apply styles to a worksheet
      const applyStyles = (ws: WorkSheet) => {
        const range = utils.decode_range(ws['!ref'] || 'A1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = utils.encode_cell({ r: R, c: C });
            if (!ws[cell_address]) continue;
            ws[cell_address].s = {
              font: { name: "Arial", sz: 11 },
              alignment: { vertical: "center", horizontal: "center", wrapText: true },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" }
              }
            };
          }
        }
      };

      // Create the main summary sheet
      let summaryData = [
        ["Data Kehadiran " + (type === 'custom' ? 'Kustom' : 'Bulanan')],
        [`Periode: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`],
        [],
        ["No.", "Nama Guru", "Kode Guru", "Jam Hadir", "Jam Tidak Hadir"]
      ];

      Object.entries(teacherAttendance).forEach(([teacherId, attendance], index) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          summaryData.push([
            (index + 1).toString(), // Ubah menjadi string
            teacher.name,
            teacher.code,
            attendance.hadir.toString(), // Ubah menjadi string
            attendance.tidakHadir.toString() // Ubah menjadi string
          ]);
        }
      });

      const summaryWs = utils.aoa_to_sheet(summaryData);
      applyStyles(summaryWs);

      // Set column widths
      summaryWs['!cols'] = [
        { wch: 5 },  // No.
        { wch: 30 }, // Nama Guru
        { wch: 15 }, // Kode Guru
        { wch: 15 }, // Jam Hadir
        { wch: 15 }  // Jam Tidak Hadir
      ];

      // Merge cells for title and period
      summaryWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
      ];

      utils.book_append_sheet(wb, summaryWs, "Ringkasan");

      // Create individual teacher sheets
      Object.entries(absentDetailsTemp).forEach(([, details]) => {
        const teacherName = details.teacherName;
        const teacherCode = details.teacherCode;
        let teacherData = [
          [`Data Ketidakhadiran: ${teacherName} (${teacherCode})`],
          [],
          ["Tanggal", "Jam Tidak Hadir", "Kelas", "Keterangan"]
        ];

        details.absences.forEach(absence => {
          teacherData.push([
            absence.date,
            absence.absentHours.toString(), // Ubah menjadi string
            absence.class,
            absence.keterangan
          ]);
        });

        const teacherWs = utils.aoa_to_sheet(teacherData);
        applyStyles(teacherWs);

        // Set column widths for teacher sheets
        teacherWs['!cols'] = [
          { wch: 15 }, // Tanggal
          { wch: 20 }, // Jam Tidak Hadir
          { wch: 15 }, // Kelas
          { wch: 40 }  // Keterangan
        ];

        // Merge cells for title
        teacherWs['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }
        ];

        utils.book_append_sheet(wb, teacherWs, `${teacherName} (${teacherCode})`);
      });

      // Generate and download the Excel file
      writeFile(wb, `kehadiran_${type === 'custom' ? 'kustom' : 'bulanan'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`);

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
            confirmedTeachers={confirmedTeachers}
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