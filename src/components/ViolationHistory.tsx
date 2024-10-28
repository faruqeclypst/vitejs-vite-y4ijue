import React from 'react';
import { useViolation } from '../contexts/ViolationContext';
import { useGuidance } from '../contexts/GuidanceContext';
import { Student } from '../types';
import { AlertCircle } from 'lucide-react';
import Modal from './Modal';

interface ViolationHistoryProps {
  student: Student;
  onClose: () => void;
}

const ViolationHistory: React.FC<ViolationHistoryProps> = ({ student, onClose }) => {
  const { getStudentViolations } = useViolation();
  const { getStudentGuidances } = useGuidance();

  const violations = getStudentViolations(student.id);
  const guidances = getStudentGuidances(student.id);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Riwayat Pelanggaran - ${student.fullName}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Kelas: {student.class} | Barak: {student.barak}
        </div>

        {violations.length > 0 ? (
          <div className="space-y-6">
            {violations.map((violation) => {
              const relatedGuidances = guidances.filter(g => g.violationId === violation.id);
              
              return (
                <div key={violation.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* Violation Details */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          violation.violationType === 'Ringan' ? 'bg-yellow-100 text-yellow-800' :
                          violation.violationType === 'Sedang' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {violation.violationType}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(violation.recordedAt).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <h3 className="mt-2 font-medium">{violation.violationDetail}</h3>
                      <p className="mt-1 text-sm text-gray-600">{violation.description}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: {violation.isResolved ? 'Selesai' : 'Belum Selesai'}
                    </div>
                  </div>

                  {/* Related Guidances */}
                  {relatedGuidances.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Riwayat Pembinaan:</h4>
                      <div className="space-y-3">
                        {relatedGuidances.map((guidance) => (
                          <div key={guidance.id} className="bg-white p-3 rounded-lg border">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-sm font-medium">
                                  {guidance.guidanceStage} - {guidance.guidanceDetail}
                                </span>
                                <p className="mt-1 text-sm text-gray-600">{guidance.description}</p>
                                {guidance.notes && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    Catatan: {guidance.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(guidance.conductedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada riwayat pelanggaran</h3>
            <p className="mt-1 text-sm text-gray-500">
              Siswa ini belum memiliki catatan pelanggaran
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViolationHistory;
