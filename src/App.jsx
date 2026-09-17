import { useState, useEffect } from 'react';
import Login from './components/Login';
import CEODashboard from './components/CEODashboard';

function App() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    if (loggedInUser.role !== 'CEO') {
      alert("This portal is only for the CEO.");
      return;
    }
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (!user) {
    return <Login onLogin={handleLogin} roleName="CEO" />;
  }

  return <CEODashboard onLogout={handleLogout} user={user} />;
}

export default App;
