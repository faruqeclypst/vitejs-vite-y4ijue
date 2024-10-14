import React from 'react';
import RosterForm from '../components/RosterForm';
import RosterTable from '../components/RosterTable';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { availableClasses } from '../types';

const RosterPage: React.FC = () => {
  const { roster, addRosterEntry, deleteRosterEntry } = useRoster();
  const { teachers } = useTeachers();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manage Roster</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <RosterForm teachers={teachers} classes={availableClasses} onSubmit={addRosterEntry} />
        </div>
        <div>
          <RosterTable roster={roster} teachers={teachers} onDelete={deleteRosterEntry} />
        </div>
      </div>
    </div>
  );
};

export default RosterPage;