import React, { useState, useEffect, useRef } from 'react';
import { Student, GuidanceStage, guidanceDetails, Guidance, Violation } from '../types';
import { Search } from 'lucide-react';
import Modal from './Modal';

interface GuidanceFormProps {
  onSubmit: (guidance: Omit<Guidance, 'id'>) => void;
  initialGuidance?: Guidance | null;
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  unhandledViolations: Violation[];
}

const GuidanceForm: React.FC<GuidanceFormProps> = ({ 
  onSubmit, 
  initialGuidance, 
  isOpen,
  onClose,
  students,
  unhandledViolations
}) => {
  const [selectedGrade, setSelectedGrade] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<GuidanceStage>('Tahap 1');
  const [selectedDetail, setSelectedDetail] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialGuidance) {
      const student = students.find(s => s.id === initialGuidance.studentId);
      if (student) {
        setSelectedStudent(student.id);
        setSelectedGrade(student.class.split('-')[0] as 'X' | 'XI' | 'XII');
      }
      setSelectedStage(initialGuidance.guidanceStage);
      setSelectedDetail(initialGuidance.guidanceDetail);
      setDescription(initialGuidance.description);
      setNotes(initialGuidance.notes);
    }
  }, [initialGuidance, students]);

  // Filter siswa berdasarkan pencarian dan kelas
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.barak.toLowerCase().includes(searchTerm.toLowerCase());
    const hasUnhandledViolation = unhandledViolations.some(v => v.studentId === student.id);
    return matchesSearch && hasUnhandledViolation;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const violation = unhandledViolations.find(v => v.studentId === selectedStudent);
    if (!violation) return;

    onSubmit({
      violationId: violation.id,
      studentId: selectedStudent,
      guidanceStage: selectedStage,
      guidanceDetail: selectedDetail,
      description,
      notes,
      conductedBy: '',  // Akan diisi di GuidanceManagement
      conductedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialGuidance ? 'Edit Pembinaan' : 'Tambah Pembinaan'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tingkatan Kelas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tingkat
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['X', 'XI', 'XII'].map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => {
                  setSelectedGrade(grade as 'X' | 'XI' | 'XII');
                  setSelectedStudent('');
                }}
                className={`py-2 px-3 text-sm rounded-md transition-colors ${
                  selectedGrade === grade 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        {/* Student Selection */}
        {selectedGrade && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Siswa yang Memiliki Pelanggaran
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  placeholder="Cari siswa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                
                {/* Tampilkan siswa yang sudah dipilih */}
                {selectedStudent && (
                  <div className="mt-2">
                    <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto p-1">
                      {students
                        .filter(s => s.id === selectedStudent)
                        .map((student) => (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              student.gender === 'Laki-laki'
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-pink-50 border border-pink-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1">
                                <span className={`text-sm font-medium truncate ${
                                  student.gender === 'Laki-laki' ? 'text-blue-700' : 'text-pink-700'
                                }`}>
                                  {student.fullName}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  student.gender === 'Laki-laki'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-pink-100 text-pink-600'
                                }`}>
                                  {student.class}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {student.barak}
                              </div>
                              {/* Tampilkan pelanggaran yang belum dibina */}
                              {unhandledViolations
                                .filter(v => v.studentId === student.id)
                                .map(v => (
                                  <div
                                    key={v.id}
                                    className="mt-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 inline-block mr-1"
                                  >
                                    {v.violationType} - {v.violationDetail}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Dropdown pencarian */}
                {searchTerm && !selectedStudent && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => {
                          setSelectedStudent(student.id);
                          setSearchTerm('');
                        }}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{student.fullName}</div>
                          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            student.gender === 'Laki-laki'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {student.gender}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-gray-100">{student.class}</span>
                          <span className="text-gray-400">•</span>
                          <span className="px-2 py-0.5 rounded bg-gray-100">{student.barak}</span>
                        </div>
                        {/* Tampilkan pelanggaran yang belum dibina */}
                        <div className="mt-1">
                          {unhandledViolations
                            .filter(v => v.studentId === student.id)
                            .map(v => (
                              <span
                                key={v.id}
                                className="inline-block mr-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800"
                              >
                                {v.violationType} - {v.violationDetail}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guidance Stage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tahap Pembinaan
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Tahap 1', 'Tahap 2', 'Tahap 3'] as GuidanceStage[]).map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => {
                  setSelectedStage(stage);
                  setSelectedDetail('');
                }}
                className={`p-2 rounded-lg transition-colors ${
                  selectedStage === stage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {/* Guidance Detail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rincian Pembinaan
          </label>
          <div className="grid grid-cols-2 gap-2">
            {guidanceDetails[selectedStage].map((detail) => (
              <button
                key={detail}
                type="button"
                onClick={() => setSelectedDetail(detail)}
                className={`p-2 rounded-lg transition-colors ${
                  selectedDetail === detail
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {detail}
              </button>
            ))}
          </div>
        </div>

        {/* Description and Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detail Pembinaan
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded-lg min-h-[100px]"
            required
            placeholder="Tambahkan detail pembinaan..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catatan Tambahan
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-lg min-h-[80px]"
            placeholder="Tambahkan catatan jika ada..."
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
          >
            {initialGuidance ? 'Update' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default GuidanceForm;
