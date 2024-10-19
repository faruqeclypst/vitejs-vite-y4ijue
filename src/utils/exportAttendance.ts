import ExcelJS from 'exceljs';
import { Attendance, RosterEntry, Teacher } from '../types';

interface ExportOptions {
  startDate: Date;
  endDate: Date;
  attendanceRecords: Attendance[];
  roster: RosterEntry[];
  teachers: Teacher[];
}

export const exportAttendance = async ({
  startDate,
  endDate,
  attendanceRecords,
  roster,
  teachers
}: ExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  
  // Create summary sheet
  const summarySheet = workbook.addWorksheet('Ringkasan');
  
  // Add title and period
  summarySheet.mergeCells('A1:E1');
  summarySheet.getCell('A1').value = 'Data Kehadiran';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  summarySheet.mergeCells('A2:E2');
  const periodText = `Periode: ${startDate.getDate()} ${startDate.toLocaleString('id-ID', { month: 'long' })} - ${endDate.getDate()} ${endDate.toLocaleString('id-ID', { month: 'long' })} ${endDate.getFullYear()}`;
  summarySheet.getCell('A2').value = periodText;
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  // Add headers
  summarySheet.addRow(['No.', 'Nama Guru', 'Kode Guru', 'Jam Hadir', 'Jam Tidak Hadir']);
  
  // Style headers
  summarySheet.getRow(3).font = { bold: true };
  summarySheet.getRow(3).alignment = { horizontal: 'center' };

  // Calculate attendance
  const teacherAttendance: { [teacherId: string]: { hadir: number; tidakHadir: number } } = {};
  const absentDetailsTemp: {
    [teacherId: string]: {
      teacherName: string;
      teacherCode: string;
      absences: Array<{
        date: string;
        absentHours: number;
        jamAbsensi: string[]; // Field baru
        class: string;
        keterangan: string;
      }>;
    };
  } = {};

  attendanceRecords.forEach(record => {
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

      // Tambah jamAbsensi sebagai string
      const absentHours = rosterEntry.hours.filter(h => !presentHours.includes(h));
      if (absentHours.length > 0) {
        absentDetailsTemp[teacherId].absences.push({
          date: record.date,
          absentHours: absentHours.length,
          jamAbsensi: absentHours.map(String), // Konversi ke string
          class: rosterEntry.classId,
          keterangan: record.keterangan || ''
        });
      }
    }
  });

  // Sort teachers alphabetically
  const sortedTeachers = teachers.sort((a, b) => a.name.localeCompare(b.name));

  // Add data to summary sheet with hyperlinks
  sortedTeachers.forEach((teacher, index) => {
    const attendance = teacherAttendance[teacher.id] || { hadir: 0, tidakHadir: 0 };
    const row = summarySheet.addRow([
      index + 1,
      teacher.name,
      teacher.code,
      attendance.hadir,
      attendance.tidakHadir
    ]);

    // Add hyperlink to teacher's name
    const nameCell = row.getCell(2);
    nameCell.value = {
      text: teacher.name,
      hyperlink: `#'${teacher.name} (${teacher.code})'!A1`
    };
    nameCell.font = { color: { argb: 'FF0000FF' }, underline: true };

    // Center all cells except the name
    row.eachCell((cell, colNumber) => {
      if (colNumber !== 2) {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Style summary sheet
  summarySheet.columns = [
    { width: 5 },  // No.
    { width: 30 }, // Nama Guru
    { width: 15 }, // Kode Guru
    { width: 15 }, // Jam Hadir
    { width: 15 }  // Jam Tidak Hadir
  ];

  // Add borders to all cells
  summarySheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Create individual teacher sheets
  sortedTeachers.forEach((teacher) => {
    const teacherSheet = workbook.addWorksheet(`${teacher.name} (${teacher.code})`);
    
    teacherSheet.mergeCells('A1:E1');
    teacherSheet.getCell('A1').value = `Rekap Tidak Hadir: ${teacher.name} (${teacher.code})`;
    teacherSheet.getCell('A1').font = { bold: true, size: 14 };
    teacherSheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add link back to summary
    teacherSheet.getCell('A2').value = {
      text: 'Kembali ke Ringkasan',
      hyperlink: '#Ringkasan!A1'
    };
    teacherSheet.getCell('A2').font = { color: { argb: 'FF0000FF' }, underline: true };

    teacherSheet.addRow(['Tanggal', 'Jam Tidak Hadir', 'Jam Absensi', 'Kelas', 'Keterangan']);
    teacherSheet.getRow(3).font = { bold: true };
    teacherSheet.getRow(3).alignment = { horizontal: 'center' };

    const details = absentDetailsTemp[teacher.id];
    if (details && details.absences.length > 0) {
      details.absences.forEach(absence => {
        const row = teacherSheet.addRow([
          absence.date,
          absence.absentHours,
          absence.jamAbsensi.join(', '), // Tampilkan jam yang tidak hadir
          absence.class,
          absence.keterangan
        ]);
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 5) { // Jangan center kolom 'Keterangan'
            cell.alignment = { horizontal: 'center' };
          }
        });
      });
    } else {
      teacherSheet.addRow(['Tidak ada data absensi untuk periode ini']);
    }

    // Style teacher sheet
    teacherSheet.columns = [
      { width: 15 }, // Tanggal
      { width: 20 }, // Jam Tidak Hadir
      { width: 20 }, // Jam Absensi
      { width: 15 }, // Kelas
      { width: 40 }  // Keterangan
    ];

    // Add borders to all cells
    teacherSheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  });

  // Generate and download the Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `kehadiran_${startDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}_${endDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}.xlsx`;
  link.click();
};
