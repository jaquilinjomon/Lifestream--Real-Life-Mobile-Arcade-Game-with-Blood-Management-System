import React, { useState } from 'react';
import RequestForm from './RequestForm';
import RequestList from './RequestList';

function Dashboard({ hospitalId, hospitalName }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="hospital-dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="section-kicker">HOSPITAL WORKSPACE</span>
          <h2>{hospitalName || "Hospital Dashboard"}</h2>
        </div>
      </div>
      <div className="hospital-workspace">
        <RequestForm onRequestCreated={() => setRefreshKey((key) => key + 1)} />
        <RequestList hospitalId={hospitalId} refreshKey={refreshKey} />
      </div>
    </div>
  );
}

export default Dashboard;
