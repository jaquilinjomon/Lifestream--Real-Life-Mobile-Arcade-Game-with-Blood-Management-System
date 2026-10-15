import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Replace with your backend login API
    const res = await axios.post('http://localhost:5000/hospitals/login', { email, password });
    if (res.data) {
      alert("Login successful!");
      onLogin(res.data.hospitalId);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Hospital Login</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
