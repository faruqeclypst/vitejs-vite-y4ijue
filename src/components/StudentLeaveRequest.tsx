import React, { useState, useEffect } from 'react';
import { StudentLeaveRequest } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

const StudentLeaveRequestForm: React.FC = () => {
  const { students } = useStudents();
  const { user } = useAuth();
  const [requests, setRequests] = useState<StudentLeaveRequest[]>([]);
  const [request, setRequest] = useState<Omit<StudentLeaveRequest, 'id' | 'status'>>({
    studentId: '',
    date: '',
    reason: ''
  });
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);

  useEffect(() => {
    // Load existing requests from localStorage
    const savedRequests = localStorage.getItem('leaveRequests');
    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to submit this leave request?')) {
      const newRequest: StudentLeaveRequest = {
        ...request,
        id: Date.now().toString(),
        status: 'Pending'
      };
      setRequests([...requests, newRequest]);
      localStorage.setItem('leaveRequests', JSON.stringify([...requests, newRequest]));
      setRequest({ studentId: '', date: '', reason: '' });
      alert('Leave request submitted successfully.');
    }
  };

  const handleStatusChange = (id: string, newStatus: 'Approved' | 'Rejected') => {
    const updatedRequests = requests.map(req =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem('leaveRequests', JSON.stringify(updatedRequests));
  };

  const toggleRequest = (requestId: string) => {
    setExpandedRequests(prev =>
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    );
  };

  const groupedRequests = requests.reduce((acc, request) => {
    if (!acc[request.status]) {
      acc[request.status] = [];
    }
    acc[request.status].push(request);
    return acc;
  }, {} as Record<string, StudentLeaveRequest[]>);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-4">Permintaan Izin Siswa</h2>
      {(user?.role === 'admin' || user?.role === 'piket') && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={request.studentId}
            onChange={(e) => setRequest({ ...request, studentId: e.target.value })}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select a student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.fullName}</option>
            ))}
          </select>
          <input
            type="date"
            value={request.date}
            onChange={(e) => setRequest({ ...request, date: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <textarea
            value={request.reason}
            onChange={(e) => setRequest({ ...request, reason: e.target.value })}
            placeholder="Reason for leave"
            className="w-full p-2 border rounded"
            required
          />
          <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
            Submit Leave Request
          </button>
        </form>
      )}

      <div className="space-y-4">
        {Object.entries(groupedRequests).map(([status, statusRequests]) => (
          <div key={status} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleRequest(status)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200"
            >
              <h3 className="font-bold text-lg">{status} Requests</h3>
              {expandedRequests.includes(status) ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            {expandedRequests.includes(status) && (
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statusRequests.map((req) => {
                      const student = students.find(s => s.id === req.studentId);
                      return (
                        <tr key={req.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{student?.fullName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{req.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{req.reason}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {req.status === 'Pending' && (user?.role === 'admin' || user?.role === 'wakil_kepala') && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(req.id, 'Approved')}
                                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded mr-2"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleStatusChange(req.id, 'Rejected')}
                                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

export default StudentLeaveRequestForm;