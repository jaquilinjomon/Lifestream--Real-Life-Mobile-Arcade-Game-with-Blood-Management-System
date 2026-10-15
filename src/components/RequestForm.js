import React, { useState } from 'react';
import axios from 'axios';

function RequestForm({ onRequestCreated }) {
  const [bloodGroup, setBloodGroup] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const hospitalId = localStorage.getItem("hospitalId");
      if (!hospitalId) {
        alert("Hospital not logged in. Please login first.");
        return;
      }

      await axios.post('http://localhost:5000/requests/register', {
        hospitalId,
        bloodGroup,
        units: quantity
      });

      alert("Request submitted successfully!");
      setBloodGroup('');
      setQuantity('');
      onRequestCreated?.();
    } catch (err) {
      alert("Failed to submit request: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="form-box">
      <h2 className="form-title">Submit Blood Request</h2>
      <form onSubmit={handleSubmit}>
        <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required>
          <option value="">-- Select Blood Group --</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
        </select>
        <input type="number" placeholder="Quantity (units)" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        <button type="submit" className="primary-btn">Submit Request</button>
      </form>
    </div>
  );
}

export default RequestForm;

