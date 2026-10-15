import React, { useEffect, useState } from 'react';
import axios from 'axios';

function RequestList({ hospitalId, refreshKey }) {
  const [requests, setRequests] = useState([]);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [unitsValue, setUnitsValue] = useState('');

  useEffect(() => {
    if (!hospitalId) {
      setRequests([]);
      return;
    }

    const fetchRequests = async () => {
      try {
        const res = await axios.get('http://localhost:5000/requests', {
          params: { hospitalId }
        });
        setRequests(res.data);
      } catch (err) {
        console.error("Error fetching requests:", err.response?.data || err.message);
      }
    };
    fetchRequests();
  }, [hospitalId, refreshKey]);

  const deleteRequest = async (request) => {
    const confirmed = window.confirm(
      `Have you received the ${request.bloodGroup} blood and want to delete this request? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`http://localhost:5000/requests/${request._id}`, {
        params: { hospitalId }
      });
      setRequests((currentRequests) => currentRequests.filter((item) => item._id !== request._id));
    } catch (err) {
      alert("Failed to delete request: " + (err.response?.data?.error || err.message));
    }
  };

  const editRequestUnits = async (request) => {
    const units = Number(unitsValue);
    if (!Number.isInteger(units) || units < 1) {
      alert("Enter a whole number of units greater than zero.");
      return;
    }

    try {
      const response = await axios.put(`http://localhost:5000/requests/${request._id}/units`, {
        hospitalId,
        units
      });
      setRequests((currentRequests) => currentRequests.map((item) => (
        item._id === request._id ? response.data.request : item
      )));
      setEditingRequestId(null);
      setUnitsValue('');
    } catch (err) {
      alert("Failed to update units: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="form-box request-list-panel">
      <h2 className="form-title">My Requests</h2>
      <table>
        <thead>
          <tr>
            <th>Hospital</th>
            <th>Blood Group</th>
            <th>Units</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req._id}>
              <td>{req.hospitalId?.name || req.hospitalName || "Unknown"}</td>
              <td>{req.bloodGroup}</td>
              <td>
                {editingRequestId === req._id ? (
                  <input
                    className="units-editor"
                    type="number"
                    min="1"
                    step="1"
                    value={unitsValue}
                    onChange={(event) => setUnitsValue(event.target.value)}
                    aria-label={`Units for ${req.bloodGroup} request`}
                  />
                ) : req.units}
              </td>
              <td>{req.status}</td>
              <td className="request-actions">
                {editingRequestId === req._id ? (
                  <>
                    <button type="button" className="save-request-btn" onClick={() => editRequestUnits(req)}>Save</button>
                    <button
                      type="button"
                      className="cancel-edit-btn"
                      onClick={() => { setEditingRequestId(null); setUnitsValue(''); }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="edit-request-btn"
                    onClick={() => { setEditingRequestId(req._id); setUnitsValue(String(req.units)); }}
                  >
                    Edit
                  </button>
                )}
                <button type="button" className="delete-request-btn" onClick={() => deleteRequest(req)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan="5">No requests submitted yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RequestList;

