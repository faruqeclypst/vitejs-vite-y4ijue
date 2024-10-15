import React from 'react';
import RosterTable from '../components/RosterTable';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { availableClasses } from '../types';

const RosterPage: React.FC = () => {
  const { roster, addRosterEntry, deleteRosterEntry } = useRoster();
  const { teachers } = useTeachers();

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Roster</h2>
      <RosterTable
        roster={roster}
        teachers={teachers}
        onDelete={deleteRosterEntry}
        onAdd={addRosterEntry}
        classes={availableClasses}
      />
    </div>
  );
};

export default RosterPage;