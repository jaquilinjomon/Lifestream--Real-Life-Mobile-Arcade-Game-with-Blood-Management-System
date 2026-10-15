import React, { useState } from 'react';
import axios from 'axios';

function HospitalLogin({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/hospitals/login', formData);
      alert(res.data.message);

      if (res.data.hospitalId) {
        localStorage.setItem("hospitalId", res.data.hospitalId);
        onLogin(res.data.hospitalId, res.data.hospitalName);
      }
    } catch (err) {
      alert("Login failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="form-box">
      <h2 className="form-title">Hospital Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        <button type="submit" className="primary-btn">Login</button>
      </form>
    </div>
  );
}

export default HospitalLogin;
