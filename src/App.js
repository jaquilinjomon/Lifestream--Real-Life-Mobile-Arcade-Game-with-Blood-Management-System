import React, { useState } from 'react';
import HospitalRegister from './components/HospitalRegister';
import HospitalLogin from './components/HospitalLogin';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import './App.css';
import logo from './components/logo1.png';

function App() {
  const [hospitalId, setHospitalId] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [showRegister, setShowRegister] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("hospitalId");
    localStorage.removeItem("adminId");
    setHospitalId(null);
    setHospitalName('');
    setAdminId(null);
    setIsAdmin(false);
  };

  return (
    <div className="portal-app">
      <div className="header">
        <div className="header-brand">
          <img src={logo} alt="LifeStream Logo" className="logo" />
          <div>
            <span className="header-kicker">BLOOD NETWORK</span>
            <h1>LifeStream <span>Portal</span></h1>
          </div>
        </div>
        <span className="header-tag">ERNAKULAM</span>
      </div>

      <main className="portal-content">
      {!hospitalId && !adminId ? (
        <>
          {isAdmin ? (
            <AdminLogin onAdminLogin={setAdminId} />
          ) : showRegister ? (
  <HospitalRegister onRegister={() => setShowRegister(false)} />
  ) : (
  <HospitalLogin onLogin={(id, name) => { setHospitalId(id); setHospitalName(name); }} />
)}
          <div className="auth-switches">
            {!isAdmin && (
              <button onClick={() => setShowRegister(!showRegister)}>
                {showRegister ? "Already registered? Login" : "New hospital? Register"}
              </button>
            )}
            <button onClick={() => setIsAdmin(!isAdmin)}>
              {isAdmin ? "Hospital Portal" : "System Admin Login"}
            </button>
          </div>
        </>
      ) : adminId ? (
        <>
          <AdminDashboard />
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Dashboard hospitalId={hospitalId} hospitalName={hospitalName} />
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </>
      )}
      </main>
    </div>
  );
}

export default App;
