import React, { useState, useEffect } from 'react';
import './App.css'; // Mantenemos el CSS original de React

function App() {
  // --- Estados para Tareas ---
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null); // Para manejar errores de la API
  // Notamos que 'description' no se usa en el backend, así que lo quitamos del estado
  // Si deseas agregar una descripción, deberás ajustar el backend y las migraciones.

  // --- Estados para Autenticación ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null); // Intenta cargar el token de localStorage
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'

  // --- Efecto para cargar el token al inicio ---
  // Si hay un token en localStorage, intentamos verificarlo o asumimos que estamos logueados
  useEffect(() => {
    if (token) {
      // En una aplicación real, aquí harías una petición para validar el token con el backend
      // Por simplicidad en este ejemplo, solo asumimos que estamos logueados si hay un token
      setIsLoggedIn(true);
      // Opcional: Podrías decodificar el token para obtener el username si lo incluyes en el payload
      // o hacer una llamada a una ruta protegida para obtener los datos del usuario.
      // Por ahora, solo indicamos que estamos logueados.
      
      // Una vez logueado, intentar cargar las tareas del usuario
      fetchTasks();
    }
  }, [token]); // Se ejecuta cuando el token cambia

  // --- Funciones Auxiliares para API ---
  const getAuthHeaders = () => {
    if (token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    }
    return { 'Content-Type': 'application/json' };
  };

  // --- Funciones de Autenticación ---

  const registerUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: getAuthHeaders(), // No requiere token para registrarse
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Error al registrarse');
      }
      alert(data.msg); // Muestra mensaje de éxito
      setAuthMode('login'); // Ir a login después de registrarse
      setUsername(''); // Limpiar campos
      setPassword('');
    } catch (e) {
      console.error("Error registering:", e);
      setError(`Error al registrarse: ${e.message}`);
    }
  };

  const loginUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: getAuthHeaders(), // No requiere token para loguearse
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Error al iniciar sesión');
      }
      localStorage.setItem('jwt_token', data.access_token); // Guarda el token en localStorage
      setToken(data.access_token); // Actualiza el estado del token
      setIsLoggedIn(true); // Cambia el estado a logueado
      setUsername(''); // Limpiar campos
      setPassword('');
      fetchTasks(); // Cargar tareas del usuario logueado
    } catch (e) {
      console.error("Error logging in:", e);
      setError(`Error al iniciar sesión: ${e.message}`);
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('jwt_token'); // Elimina el token de localStorage
    setToken(null); // Limpia el estado del token
    setIsLoggedIn(false); // Cambia el estado a no logueado
    setTasks([]); // Limpia las tareas mostradas
    setError(null);
    alert('Sesión cerrada correctamente.');
  };

  // --- Funciones para Tareas (Ahora con token JWT) ---

  const fetchTasks = async () => {
    // Solo intentar obtener tareas si estamos logueados y tenemos un token
    if (!token) return; 

    try {
      const response = await fetch('/tasks', {
        headers: getAuthHeaders(), // Incluye el token aquí
      });
      if (!response.ok) {
        // Si el token es inválido/expirado, el backend devolverá 401
        if (response.status === 401) {
            setError("Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.");
            logoutUser(); // Forzar logout si el token no es válido
        }
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.msg || 'Unknown error'}`);
      }
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (e) {
      console.error("Error fetching tasks:", e);
      // No forzar logout aquí, ya lo hace si es 401. Solo mostrar mensaje.
      if (!isLoggedIn) { // Si no estamos logueados, el error es normal al inicio
         setError(null); // No mostrar error si no hay token (ej. al cargar la app)
      } else {
         setError("No se pudieron cargar las tareas. ¿Está el backend corriendo y tu sesión activa?");
      }
    }
  };

  // Se ejecuta una vez al montar y cuando el estado isLoggedIn cambia
  useEffect(() => {
    if (isLoggedIn) {
      fetchTasks();
    }
  }, [isLoggedIn]); // Dependencia actualizada


  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título de la tarea no puede estar vacío.");
      return;
    }
    setError(null); // Limpiar errores antes de la nueva petición

    try {
      const response = await fetch('/tasks', {
        method: 'POST',
        headers: getAuthHeaders(), // Incluye el token aquí
        body: JSON.stringify({ title }), // 'description' no está en el backend
      });
      if (!response.ok) {
        if (response.status === 401) {
            setError("Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.");
            logoutUser();
        }
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.msg || 'Unknown error'}`);
      }
      setTitle('');
      fetchTasks();
    } catch (e) {
      console.error("Error adding task:", e);
      setError(`Error al añadir tarea: ${e.message}`);
    }
  };

  const toggleTaskCompletion = async (taskId, currentCompletedStatus) => {
    setError(null); // Limpiar errores antes de la nueva petición
    try {
      const response = await fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(), // Incluye el token aquí
        body: JSON.stringify({ done: !currentCompletedStatus }), // Backend espera 'done'
      });
      if (!response.ok) {
        if (response.status === 401) {
            setError("Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.");
            logoutUser();
        }
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.msg || 'Unknown error'}`);
      }
      fetchTasks();
    } catch (e) {
      console.error("Error toggling task:", e);
      setError(`Error al actualizar la tarea: ${e.message}`);
    }
  };

  const deleteTask = async (taskId) => {
    setError(null); // Limpiar errores antes de la nueva petición
    try {
      const response = await fetch(`/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(), // Incluye el token aquí
      });
      if (!response.ok) {
        if (response.status === 401) {
            setError("Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.");
            logoutUser();
        }
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.msg || 'Unknown error'}`);
      }
      fetchTasks();
    } catch (e) {
      console.error("Error deleting task:", e);
      setError(`Error al eliminar la tarea: ${e.message}`);
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Lista de Tareas</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Sección de Autenticación */}
        {!isLoggedIn ? (
          <div style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9', color: 'black' }}>
            <h2>{authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h2>
            <form onSubmit={authMode === 'login' ? loginUser : registerUser}>
              <input
                type="text"
                placeholder="Nombre de Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ marginRight: '10px', padding: '8px', marginBottom: '10px' }}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ marginRight: '10px', padding: '8px', marginBottom: '10px' }}
                required
              />
              <button type="submit" style={{ padding: '8px 15px' }}>
                {authMode === 'login' ? 'Ingresar' : 'Registrar'}
              </button>
            </form>
            <p style={{ marginTop: '15px' }}>
              {authMode === 'login' ? (
                <>¿No tienes cuenta? <button onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Regístrate</button></>
              ) : (
                <>¿Ya tienes cuenta? <button onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Inicia Sesión</button></>
              )}
            </p>
          </div>
        ) : (
          // Sección de Tareas si está logueado
          <>
            <p style={{fontSize: '1.2em'}}>¡Bienvenido, {username || 'usuario'}!
                <button onClick={logoutUser} style={{ marginLeft: '20px', padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Cerrar Sesión
                </button>
            </p>
            
            {/* Formulario para añadir nueva tarea */}
            <form onSubmit={addTask} style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Título de la tarea"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ marginRight: '10px', padding: '8px' }}
                required
              />
              {/* Eliminamos el campo de descripción si no se usa en el backend */}
              <button type="submit" style={{ padding: '8px 15px' }}>Añadir Tarea</button>
            </form>

            {/* Lista de tareas */}
            <div className="task-list" style={{ width: '80%', maxWidth: '600px' }}>
              {tasks.length === 0 ? (
                <p>No hay tareas. ¡Añade una!</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} style={{
                    border: '1px solid #ccc',
                    padding: '10px',
                    margin: '10px 0',
                    borderRadius: '5px',
                    backgroundColor: task.done ? '#e0ffe0' : '#fff', // Usar task.done
                    color: '#333',
                    textAlign: 'left'
                  }}>
                    <h3>
                      <input
                        type="checkbox"
                        checked={task.done} // Usar task.done
                        onChange={() => toggleTaskCompletion(task.id, task.done)} // Usar task.done
                        style={{ marginRight: '10px' }}
                      />
                      {task.title}
                    </h3>
                    {/* Eliminamos la descripción del frontend si no está en el backend */}
                    <small>Creada: {new Date(task.created_at).toLocaleString()}</small><br/>
                    {/* El backend no devuelve 'updated_at' para las tareas, solo created_at */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{
                        backgroundColor: '#ff4d4d',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        float: 'right'
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </header>
    </div>
  );
}

export default App;