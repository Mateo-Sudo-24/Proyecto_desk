import React, { useState } from 'react';
import useFetch from '../Hooks/useFetch';

export default function Login({ onLogin }) {
  const [workId, setWorkId] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, fetchData } = useFetch('/api/employees/login', { method: 'POST' }, false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await fetchData({ workId, password });
    if (result && result.user) {
      if (onLogin) onLogin(result.user, result.token); // Guarda usuario/token en estado global
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Iniciar Sesión Recepcionista</h2>
      <input value={workId} onChange={e => setWorkId(e.target.value)} placeholder="ID de trabajo" required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required />
      <button type="submit" disabled={loading}>Entrar</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}