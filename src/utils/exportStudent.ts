import ExcelJS from 'exceljs';
import { Student } from '../types';

interface ExportOptions {
  students: Student[];
  baraks: { id: string; name: string; gender: 'Laki-laki' | 'Perempuan' }[];
}

export const exportStudent = async ({ students, baraks }: ExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  
  // Create summary sheet
  const summarySheet = workbook.addWorksheet('Ringkasan');
  
  // Add title to summary
  summarySheet.mergeCells('A1:F1');
  summarySheet.getCell('A1').value = 'Ringkasan Data Siswa';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  // Add period to summary
  summarySheet.mergeCells('A2:F2');
  const periodText = `Per Tanggal: ${new Date().toLocaleDateString('id-ID', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric'
  })}`;
  summarySheet.getCell('A2').value = periodText;
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  // Add headers to summary
  summarySheet.addRow(['No.', 'Barak', 'Jumlah Siswa', 'Tipe Barak', 'Link Detail']);
  
  // Style headers
  summarySheet.getRow(3).font = { bold: true };
  summarySheet.getRow(3).alignment = { horizontal: 'center' };

  // Group students by barak
  const groupedStudents = students.reduce((acc, student) => {
    if (!acc[student.barak]) {
      acc[student.barak] = [];
    }
    acc[student.barak].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Sort baraks
  const sortedBaraks = baraks.sort((a, b) => a.name.localeCompare(b.name));

  // Add summary data and create individual sheets
  sortedBaraks.forEach((barak, index) => {
    const barakStudents = groupedStudents[barak.name] || [];
    if (barakStudents.length > 0) {
      // Add to summary
      summarySheet.addRow([
        index + 1,
        barak.name,
        barakStudents.length,
        barak.gender,
        { text: 'Lihat Detail', hyperlink: `#'${barak.name} (${barak.gender})'!A1` }
      ]);

      // Create sheet for this barak
      const barakSheet = workbook.addWorksheet(`${barak.name} (${barak.gender})`);
      
      // Add title
      barakSheet.mergeCells('A1:D1');
      barakSheet.getCell('A1').value = `Data Siswa - ${barak.name} (${barak.gender})`;
      barakSheet.getCell('A1').font = { bold: true, size: 16 };
      barakSheet.getCell('A1').alignment = { horizontal: 'center' };

      // Add period
      barakSheet.mergeCells('A2:D2');
      barakSheet.getCell('A2').value = periodText;
      barakSheet.getCell('A2').alignment = { horizontal: 'center' };

      // Add headers
      barakSheet.addRow(['No.', 'Nama Siswa', 'Kelas']);
      barakSheet.getRow(3).font = { bold: true };
      barakSheet.getRow(3).alignment = { horizontal: 'center' };

      // Add students
      barakStudents
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .forEach((student, studentIndex) => {
          barakSheet.addRow([
            studentIndex + 1,
            student.fullName,
            student.class
          ]);
        });

      // Style columns for barak sheet
      barakSheet.columns = [
        { width: 10 },  // No.
        { width: 40 }, // Nama Siswa
        { width: 20 }  // Kelas
      ];

      // Add borders to all cells in barak sheet
      barakSheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      });
    }
  });

  // Style columns for summary sheet
  summarySheet.columns = [
    { width: 10 },  // No.
    { width: 30 }, // Barak
    { width: 20 }, // Jumlah Siswa
    { width: 20 }, // Tipe Barak
    { width: 20 }  // Link Detail
  ];

  // Add borders to all cells in summary sheet
  summarySheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  // Add total row to summary
  summarySheet.addRow([]);
  const totalRow = summarySheet.addRow([
    'Total',
    '',
    students.length,
    '',
    ''
  ]);
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

  // Generate and download the Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `data_siswa_${new Date().toLocaleDateString('id-ID', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(/ /g, '_')}.xlsx`;
  link.click();
};
