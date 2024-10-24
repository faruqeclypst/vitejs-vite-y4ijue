import React, { useState, useEffect } from 'react';
import { Student, availableClasses } from '../types';
import { useStudents } from '../contexts/StudentContext';
import Papa from 'papaparse';
import { ChevronDown, ChevronUp } from 'lucide-react';

const StudentManagement: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent } = useStudents();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    fullName: '',
    gender: 'Male',
    class: availableClasses[0],
    asrama: ''
  });
  const [asramaList, setAsramaList] = useState<string[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  useEffect(() => {
    const uniqueAsramas = Array.from(new Set(students.map(s => s.asrama))).filter(Boolean);
    setAsramaList(uniqueAsramas);
  }, [students]);

  const handleAddOrUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudent(editingStudent.id, newStudent);
      setEditingStudent(null);
    } else {
      addStudent(newStudent);
    }
    setNewStudent({ fullName: '', gender: 'Male', class: availableClasses[0], asrama: '' });
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent(student);
  };

  const handleAsramaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewStudent({ ...newStudent, asrama: value });
    if (value && !asramaList.includes(value)) {
      setAsramaList([...asramaList, value]);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const importedStudents = results.data.slice(1).map((row: any) => ({
            fullName: row[0],
            gender: row[1] as 'Male' | 'Female',
            class: row[2],
            asrama: row[3]
          }));
          importedStudents.forEach(student => {
            if (student.fullName && student.gender && student.class && student.asrama) {
              addStudent(student);
            }
          });
          alert('Students imported successfully!');
        },
        header: true,
        skipEmptyLines: true
      });
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(students);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'students.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleClass = (className: string) => {
    setExpandedClasses(prev =>
      prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]
    );
  };

  const groupedStudents = students.reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = [];
    }
    acc[student.class].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-4">Kelola Siswa</h2>
      <form onSubmit={handleAddOrUpdateStudent} className="space-y-4">
        <input
          type="text"
          value={newStudent.fullName}
          onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
          placeholder="Full Name"
          required
          className="w-full p-2 border rounded"
        />
        <select
          value={newStudent.gender}
          onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as 'Male' | 'Female' })}
          className="w-full p-2 border rounded"
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select
          value={newStudent.class}
          onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
          className="w-full p-2 border rounded"
        >
          {availableClasses.map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <input
          type="text"
          value={newStudent.asrama}
          onChange={handleAsramaChange}
          placeholder="Asrama"
          list="asrama-list"
          className="w-full p-2 border rounded"
        />
        <datalist id="asrama-list">
          {asramaList.map((asrama) => (
            <option key={asrama} value={asrama} />
          ))}
        </datalist>
        <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
          {editingStudent ? 'Update Student' : 'Add Student'}
        </button>
      </form>

      <div className="flex space-x-4">
        <label className="cursor-pointer bg-green-500 text-white p-2 rounded">
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
        </label>
        <button onClick={handleExportCSV} className="bg-yellow-500 text-white p-2 rounded">
          Export CSV
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedStudents).map(([className, classStudents]) => (
          <div key={className} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleClass(className)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200"
            >
              <h3 className="font-bold text-lg">{className}</h3>
              {expandedClasses.includes(className) ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            {expandedClasses.includes(className) && (
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asrama</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{student.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{student.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{student.asrama}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentManagement;