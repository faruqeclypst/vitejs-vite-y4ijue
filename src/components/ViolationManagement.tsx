import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useViolation } from '../contexts/ViolationContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, Violation } from '../types';
import { Plus, Search } from 'lucide-react';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import ViolationHistory from './ViolationHistory';
import ViolationForm from './ViolationForm';
import LoadingSpinner from './common/LoadingSpinner';

const ViolationManagement: React.FC = () => {
  const { violations, addViolation, updateViolation } = useViolation();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [currentViolationIndex, setCurrentViolationIndex] = useState<number>(0);
  const [showViolationForm, setShowViolationForm] = useState(false);

  // Kelompokkan pelanggaran berdasarkan siswa
  const groupedViolations = useMemo(() => {
    const grouped = violations.reduce((acc, violation) => {
      const student = students.find(s => s.id === violation.studentId);
      if (!student || student.isDeleted) return acc;

      if (!acc[student.id]) {
        acc[student.id] = {
          student,
          violations: []
        };
      }
      acc[student.id].violations.push(violation);
      return acc;
    }, {} as Record<string, { student: Student; violations: Violation[] }>);

    // Filter berdasarkan pencarian
    return Object.values(grouped).filter(({ student }) =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.barak.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [violations, students, searchTerm]);

  // Tambahkan useEffect untuk animasi
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentViolationIndex(prevIndex => {
        const violations = groupedViolations.flatMap(group => group.violations);
        return prevIndex + 1 >= violations.length ? 0 : prevIndex + 1;
      });
    }, 2000); // Ganti setiap 2 detik

    return () => clearInterval(intervalId);
  }, [groupedViolations]);

  const handleSubmit = async (violationData: Omit<Violation, 'id'>) => {
    try {
      if (editingViolation) {
        await updateViolation(editingViolation.id, {
          ...violationData,
          recordedBy: currentUser?.id || '',
          recordedAt: editingViolation.recordedAt,
          isResolved: editingViolation.isResolved
        });
        showAlert({
          type: 'success',
          message: 'Data pelanggaran berhasil diperbarui'
        });
      } else {
        await addViolation({
          ...violationData,
          recordedBy: currentUser?.id || '',
          recordedAt: new Date().toISOString(),
          isResolved: false
        });
        showAlert({
          type: 'success',
          message: 'Data pelanggaran berhasil ditambahkan'
        });
      }
      setShowViolationForm(false);
      setEditingViolation(null);
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data pelanggaran'
      });
    }
  };

  const handleAddViolation = () => {
    setShowViolationForm(true);
  };

  return (
    <div className="relative">
      {/* Alert dan ConfirmationModal */}
      <div className="absolute top-0 left-0 right-0 z-[100]">
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={hideAlert}
          />
        )}
      </div>
      
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative bg-white rounded-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={previewPhoto}
              alt="Student"
              className="w-[400px] h-[400px] object-cover" // Ukuran fix 400x400
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header dan Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-8 border rounded-lg"
            />
            <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
          </div>
          <button
            onClick={handleAddViolation}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Tambah Pelanggaran</span>
          </button>
        </div>

        {/* ViolationForm Modal */}
        <Suspense fallback={<LoadingSpinner />}>
          <ViolationForm
            isOpen={showViolationForm}
            onClose={() => setShowViolationForm(false)}
            onSubmit={handleSubmit}
            initialViolation={editingViolation}
            students={students}
          />
        </Suspense>

        {/* Daftar Pelanggaran (Dikelompokkan per Siswa) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          {groupedViolations.map(({ student, violations }) => {
            const latestViolation = violations[currentViolationIndex % violations.length];
            const unresolved = violations.filter(v => !v.isResolved).length;

            return (
              <div key={student.id} className="flex bg-white rounded-xl overflow-hidden">
                {/* Left Color Bar - animasi warna berdasarkan jenis pelanggaran */}
                <div className={`w-2 flex-shrink-0 transition-colors duration-500 ${
                  latestViolation.violationType === 'Ringan' ? 'bg-yellow-400' :
                  latestViolation.violationType === 'Sedang' ? 'bg-orange-500' :
                  'bg-red-500'
                }`} />
                
                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                        onClick={() => student.photoUrl && setPreviewPhoto(student.photoUrl)}
                      >
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {student.fullName.split(' ').map(name => name[0]).join('').substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{student.fullName}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            {student.class}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            {student.barak}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium text-gray-900">
                        {violations.length} Pelanggaran
                      </span>
                      {unresolved > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          {unresolved} Belum Dibina
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Latest Violation Summary */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            {/* Badge jenis pelanggaran dengan animasi */}
                            <div className="mb-2 transition-all duration-500">
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                latestViolation.violationType === 'Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                latestViolation.violationType === 'Sedang' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {latestViolation.violationType}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{latestViolation.violationDetail}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{latestViolation.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Date & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(latestViolation.recordedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedStudentForHistory(student)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm">Lihat Detail</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* History Modal */}
        {selectedStudentForHistory && (
          <Suspense fallback={<LoadingSpinner />}>
            <ViolationHistory
              student={selectedStudentForHistory}
              onClose={() => setSelectedStudentForHistory(null)}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default ViolationManagement;
