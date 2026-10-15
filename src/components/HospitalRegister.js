import React, { useState } from 'react';
import axios from 'axios';

function HospitalRegister({ onRegister }) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    location: 'Ernakulam',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/hospitals/register', formData);
      alert(res.data.message);

      if (res.data.hospital) {
  alert("Registration successful! Please login now.");
  onRegister(); // just trigger the switch to login
}

    } catch (err) {
      alert("Registration failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="form-box">
      <h2 className="form-title">Hospital Registration</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Hospital Name" value={formData.name} onChange={handleChange} required />
        <input type="text" name="contactPerson" placeholder="Contact Person" value={formData.contactPerson} onChange={handleChange} required />
        <input type="text" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="text" name="location" value={formData.location} readOnly />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        <button type="submit" className="primary-btn">Register Hospital</button>
      </form>
    </div>
  );
}

export default HospitalRegister;


