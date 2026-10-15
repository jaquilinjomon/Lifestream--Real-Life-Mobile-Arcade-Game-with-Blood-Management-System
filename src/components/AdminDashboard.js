import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axios.get('http://localhost:5000/requests');
        setRequests(res.data);
      } catch (err) {
        console.error("Error fetching requests:", err.response?.data || err.message);
      }
    };
    fetchRequests();

    const refreshInterval = window.setInterval(fetchRequests, 5000);
    window.addEventListener('focus', fetchRequests);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', fetchRequests);
    };
  }, []);

const updateStatus = async (id, status) => {
  try {
    if (status === "Approved") {
      // Call the approve route that emits the alert
      await axios.post(`http://localhost:5000/requests/approve/${id}`);
    } else {
      // For reject, keep using PUT
      await axios.put(`http://localhost:5000/requests/${id}`, { status });
    }
    setRequests(currentRequests => currentRequests.map(r => r._id === id ? { ...r, status } : r));
  } catch (err) {
    alert("Failed to update status: " + (err.response?.data?.error || err.message));
  }
};

  const hospitalGroups = Object.values(requests.reduce((groups, request) => {
    const hospitalName = request.hospitalId?.name || request.hospitalName || "Unknown Hospital";
    const hospitalId = request.hospitalId?._id || request.hospitalId;
    const id = hospitalId ? String(hospitalId) : `name:${hospitalName}`;

    if (!groups[id]) {
      groups[id] = { id, name: hospitalName, requests: [], pendingCount: 0 };
    }
    groups[id].requests.push(request);
    if (request.status?.toLowerCase() === "pending") {
      groups[id].pendingCount += 1;
    }
    return groups;
  }, {})).sort((first, second) => first.name.localeCompare(second.name));
  const pendingTotal = requests.filter((request) => request.status?.toLowerCase() === "pending").length;

  return (
    <div className="form-box admin-dashboard">
      <div className="admin-heading">
        <div>
          <span className="section-kicker">NETWORK OVERVIEW</span>
          <h2 className="form-title">Admin Dashboard</h2>
        </div>
        <span className="overview-chip"><strong>{pendingTotal}</strong> pending across network</span>
      </div>
      <h3>Requests by Hospital</h3>
      {hospitalGroups.length === 0 ? (
        <p>No hospital requests yet.</p>
      ) : hospitalGroups.map((group) => (
        <section className="hospital-group" key={group.id}>
          <button
            type="button"
            className="hospital-group-toggle"
            aria-expanded={selectedHospitalId === group.id}
            onClick={() => setSelectedHospitalId(currentId => currentId === group.id ? null : group.id)}
          >
            <span>{group.name}</span>
            <span className="pending-count">
              <strong>{group.pendingCount}</strong>
              <span>{group.pendingCount === 1 ? "pending request" : "pending requests"}</span>
            </span>
          </button>
          {selectedHospitalId === group.id && (
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Blood Group</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.requests.map(req => (
                  <tr key={req._id}>
                    <td>{req.bloodGroup}</td>
                    <td>{req.units}</td>
                    <td>{req.status}</td>
                    <td className="request-actions">
                      {req.status === "Pending" && (
                        <>
                          <button className="secondary-btn" onClick={() => updateStatus(req._id, "Approved")}>Approve</button>
                          <button className="secondary-btn" onClick={() => updateStatus(req._id, "Rejected")}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}

export default AdminDashboard;
