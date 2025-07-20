import React, { useState, useEffect } from 'react';
import './App.css'; // Mantenemos el CSS original de React

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null); // Para manejar errores de la API

  // Función para obtener las tareas de la API
  const fetchTasks = async () => {
    try {
      // Usamos '/tasks' porque el proxy redirigirá a 'http://localhost:5000/tasks'
      const response = await fetch('/tasks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTasks(data);
      setError(null); // Limpiar errores si la petición fue exitosa
    } catch (e) {
      console.error("Error fetching tasks:", e);
      setError("No se pudieron cargar las tareas. ¿Está el backend corriendo?");
    }
  };

  // Se ejecuta una vez cuando el componente se monta (al cargar la página)
  useEffect(() => {
    fetchTasks();
  }, []); // Array vacío significa que se ejecuta solo una vez al montar

  // Función para añadir una nueva tarea
  const addTask = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    if (!title.trim()) {
      setError("El título de la tarea no puede estar vacío.");
      return;
    }

    try {
      const response = await fetch('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      // Si la tarea se añadió con éxito, recargamos la lista
      setTitle(''); // Limpiar el campo de título
      setDescription(''); // Limpiar el campo de descripción
      fetchTasks(); // Recargar todas las tareas
      setError(null);
    } catch (e) {
      console.error("Error adding task:", e);
      setError(`Error al añadir tarea: ${e.message}`);
    }
  };

  // Función para marcar/desmarcar tarea como completada
  const toggleTaskCompletion = async (taskId, currentCompletedStatus) => {
    try {
      const response = await fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !currentCompletedStatus }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchTasks(); // Recargar todas las tareas para ver el cambio
      setError(null);
    } catch (e) {
      console.error("Error toggling task:", e);
      setError("Error al actualizar la tarea.");
    }
  };

  // Función para eliminar una tarea
  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchTasks(); // Recargar todas las tareas
      setError(null);
    } catch (e) {
      console.error("Error deleting task:", e);
      setError("Error al eliminar la tarea.");
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Lista de Tareas</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>} {/* Muestra errores */}

        {/* Formulario para añadir nueva tarea */}
        <form onSubmit={addTask} style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Título de la tarea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginRight: '10px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginRight: '10px', padding: '8px' }}
          />
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
                backgroundColor: task.completed ? '#e0ffe0' : '#fff',
                color: '#333',
                textAlign: 'left'
              }}>
                <h3>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompletion(task.id, task.completed)}
                    style={{ marginRight: '10px' }}
                  />
                  {task.title}
                </h3>
                {task.description && <p>{task.description}</p>}
                <small>Creada: {new Date(task.created_at).toLocaleString()}</small><br/>
                <small>Actualizada: {new Date(task.updated_at).toLocaleString()}</small>
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
      </header>
    </div>
  );
}

export default App;