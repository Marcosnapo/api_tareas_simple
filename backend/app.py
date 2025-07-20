import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# --- 1. Configuración de la aplicación Flask ---
app = Flask(__name__)

# Configuración de la base de datos
# DATABASE_URL = "postgresql://usuario:contraseña@host:puerto/nombre_base_de_datos"
# ¡IMPORTANTE! Reemplaza 'marcosnapo' con tu usuario de DB y 'tu_contrasena_segura' con tu contraseña de DB
# El puerto por defecto es 5432
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://marcosnapo:123456@localhost:5432/api_tareas_db')

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Desactiva el seguimiento de modificaciones para reducir el uso de memoria
db = SQLAlchemy(app)

# --- 2. Modelo de la Base de Datos (Tabla de Tareas) ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Task {self.id}: {self.title}>'

    # Método para serializar el objeto Task a un diccionario (JSON)
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed,
            'created_at': self.created_at.isoformat(), # Formato ISO para fechas
            'updated_at': self.updated_at.isoformat()
        }

# --- 3. Rutas de la API (Endpoints CRUD) ---

# Ruta para crear una nueva tarea (CREATE)
@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    if not data or not 'title' in data:
        return jsonify({"error": "Title is required"}), 400

    new_task = Task(
        title=data['title'],
        description=data.get('description'), # .get() para que no sea obligatorio
        completed=data.get('completed', False)
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201 # 201 Created

# Ruta para obtener todas las tareas (READ ALL)
@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks])

# Ruta para obtener una sola tarea por ID (READ ONE)
@app.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    task = Task.query.get_or_404(task_id) # get_or_404 para manejar si no existe
    return jsonify(task.to_dict())

# Ruta para actualizar una tarea existente (UPDATE)
@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'completed' in data:
        task.completed = data['completed']

    db.session.commit()
    return jsonify(task.to_dict())

# Ruta para eliminar una tarea (DELETE)
@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 204 # 204 No Content

# --- 4. Inicialización de la Base de Datos (Crear Tablas) ---
@app.cli.command('create-db')
def create_db_command():
    """Crea las tablas de la base de datos."""
    with app.app_context():
        db.create_all()
        print("Base de datos y tablas creadas!")

# --- 5. Ejecución de la aplicación ---
if __name__ == '__main__':
    app.run(debug=True) # debug=True para desarrollo (recarga automática y errores detallados)