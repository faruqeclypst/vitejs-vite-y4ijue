import React, { useState } from 'react';
import { Student, LeaveType } from '../types';
import { Search } from 'lucide-react';
import Modal from './Modal';

interface StudentLeaveRequestProps {
  onSubmit: (data: {
    studentId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    keterangan: string;
    documentUrl?: string;
  }) => void;
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
}

const StudentLeaveRequest: React.FC<StudentLeaveRequestProps> = ({
  onSubmit,
  students,
  isOpen,
  onClose
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('Izin');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.barak.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    onSubmit({
      studentId: selectedStudent.id,
      leaveType,
      startDate,
      endDate,
      startTime,
      endTime,
      keterangan,
      documentUrl: documentUrl || undefined
    });

    // Reset form
    setSelectedStudent(null);
    setLeaveType('Izin');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setKeterangan('');
    setDocumentUrl('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Perizinan"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Siswa
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 border rounded-lg"
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            
            {/* Selected Student */}
            {selectedStudent && (
              <div className="mt-2">
                <div className={`p-2 rounded-lg ${
                  selectedStudent.gender === 'Laki-laki'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-pink-50 border border-pink-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedStudent.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {selectedStudent.class} • {selectedStudent.barak}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown */}
            {!selectedStudent && searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setSearchTerm('');
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="font-medium">{student.fullName}</div>
                    <div className="text-sm text-gray-500">
                      {student.class} • {student.barak}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jenis Izin
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Izin', 'Sakit', 'Pulang', 'Lomba'] as LeaveType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setLeaveType(type)}
                className={`p-2 rounded-lg transition-colors ${
                  leaveType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jam Mulai
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jam Selesai
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keterangan
          </label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="w-full p-2 border rounded-lg min-h-[100px]"
            required
            placeholder="Tambahkan keterangan..."
          />
        </div>

        {/* Document URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL Dokumen (Opsional)
          </label>
          <input
            type="url"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="https://..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
            disabled={!selectedStudent}
          >
            Simpan
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentLeaveRequest;
