import React, { useState, useEffect, useRef } from 'react';
import { Student, ViolationType, violationDetails, Violation } from '../types';
import { Search, X } from 'lucide-react';
import Modal from './Modal';

interface ViolationFormProps {
  onSubmit: (violation: Omit<Violation, 'id'>) => void;
  initialViolation?: Violation | null;
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  mode?: 'add' | 'edit';
}

const ViolationForm: React.FC<ViolationFormProps> = ({ 
  onSubmit, 
  initialViolation, 
  isOpen,
  onClose,
  students,
  mode = 'add'
}) => {
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [violationType, setViolationType] = useState<ViolationType>('Ringan');
  const [violationDetail, setViolationDetail] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialViolation) {
      const student = students.find(s => s.id === initialViolation.studentId);
      if (student) {
        setSelectedStudents([student]);
      }
      setViolationType(initialViolation.violationType);
      setViolationDetail(initialViolation.violationDetail);
      setDescription(initialViolation.description);
    }
  }, [initialViolation, students]);

  // Filter siswa berdasarkan pencarian
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.barak.toLowerCase().includes(searchTerm.toLowerCase());
    // Tambahkan filter untuk siswa aktif                     
    const isActive = !student.isDeleted && student.status === 'Aktif';
    return matchesSearch && isActive;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchTerm('');
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) return;

    // Untuk edit tetap single student
    if (initialViolation) {
      onSubmit({
        studentId: selectedStudents[0].id,
        violationType,
        violationDetail,
        description,
        recordedBy: '',
        recordedAt: new Date().toISOString(),
        isResolved: false
      });
    } else {
      // Untuk tambah baru, submit untuk setiap siswa yang dipilih
      selectedStudents.forEach(student => {
        onSubmit({
          studentId: student.id,
          violationType,
          violationDetail,
          description,
          recordedBy: '',
          recordedAt: new Date().toISOString(),
          isResolved: false
        });
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Pelanggaran' : 'Tambah Pelanggaran'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Selection - hide in edit mode */}
        {mode === 'add' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {initialViolation ? 'Siswa' : 'Pilih Siswa'} {selectedStudents.length > 0 && `(${selectedStudents.length} dipilih)`}
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  placeholder="Cari siswa..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onClick={() => {
                    if (!initialViolation) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (!initialViolation) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  className={`w-full p-3 pl-10 border rounded-lg ${
                    initialViolation ? 'bg-gray-100' : ''
                  }`}
                  readOnly={!!initialViolation}
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                
                {/* Tampilkan siswa yang sudah dipilih */}
                {selectedStudents.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-500 mb-2">
                      {selectedStudents.length} siswa terpilih
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto p-1">
                      {selectedStudents.map((student) => (
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
                          </div>
                          {!initialViolation && (
                            <button
                              type="button"
                              onClick={() => setSelectedStudents(prev => prev.filter(s => s.id !== student.id))}
                              className={`ml-2 p-1 rounded-full hover:bg-opacity-80 ${
                                student.gender === 'Laki-laki'
                                  ? 'hover:bg-blue-100 text-blue-600'
                                  : 'hover:bg-pink-100 text-pink-600'
                              }`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dropdown pencarian */}
                {!initialViolation && isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
                    {filteredStudents
                      .filter(student => !selectedStudents.some(s => s.id === student.id))
                      .map((student) => (
                        <div
                          key={student.id}
                          onClick={() => {
                            setSelectedStudents(prev => [...prev, student]);
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
                        </div>
                      ))}
                    {/* Tampilkan pesan jika tidak ada hasil */}
                    {filteredStudents.length === 0 && (
                      <div className="p-3 text-center text-gray-500">
                        {searchTerm ? 'Tidak ada siswa yang ditemukan' : 'Ketik untuk mencari siswa'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Violation Type - always editable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jenis Pelanggaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Ringan', 'Sedang', 'Berat'] as ViolationType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setViolationType(type);
                  setViolationDetail('');
                }}
                className={`p-2 rounded-lg transition-colors ${
                  violationType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Violation Detail - always editable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rincian Pelanggaran
          </label>
          <div className="grid grid-cols-2 gap-2">
            {violationDetails[violationType].map((detail) => (
              <button
                key={detail}
                type="button"
                onClick={() => setViolationDetail(detail)}
                className={`p-2 rounded-lg transition-colors text-xs sm:text-base ${
                  violationDetail === detail
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {detail}
              </button>
            ))}
          </div>
        </div>

        {/* Description - always editable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detail Pelanggaran
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded-lg min-h-[100px]"
            required
            placeholder="Tambahkan detail pelanggaran..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
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
            {mode === 'edit' ? 'Update' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ViolationForm;
