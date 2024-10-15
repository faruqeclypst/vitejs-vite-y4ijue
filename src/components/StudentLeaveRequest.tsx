import React, { useState, useEffect } from 'react';
import { StudentLeaveRequest } from '../types';
import { useStudents } from '../contexts/StudentContext';


const StudentLeaveRequestForm: React.FC = () => {
  const { students } = useStudents();
  const [requests, setRequests] = useState<StudentLeaveRequest[]>([]);
  const [request, setRequest] = useState<Omit<StudentLeaveRequest, 'id' | 'status'>>({
    studentId: '',
    date: '',
    reason: ''
  });

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

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-4">Permintaan Izin Siswa</h2>
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

      <div>
        <h2 className="text-xl font-bold mb-4">Leave Requests</h2>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">Student</th>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Reason</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const student = students.find(s => s.id === req.studentId);
              return (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{student?.fullName}</td>
                  <td className="py-2 px-4 border-b">{req.date}</td>
                  <td className="py-2 px-4 border-b">{req.reason}</td>
                  <td className="py-2 px-4 border-b">{req.status}</td>
                  <td className="py-2 px-4 border-b">
                    {req.status === 'Pending' && (
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
    </div>
  );
};

export default StudentLeaveRequestForm;