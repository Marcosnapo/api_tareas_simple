import os
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Configuración de la Base de Datos
# Si la variable de entorno no está definida, usa una por defecto (para desarrollo local)
# ¡Asegúrate de que la contraseña aquí coincida con la que estableciste en PostgreSQL!
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:123456@localhost:5432/api_tareas_db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configuración de JWT
# ¡Cambiar por una clave real en producción! Usa una variable de entorno.
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-jwt-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24) # Los tokens expiran en 24 horas

db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app) # Habilita CORS para todas las rutas
jwt = JWTManager(app) # Inicializa JWTManager con la aplicación

# Modelos
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    tasks = db.relationship('Task', backref='author', lazy=True) # Relación con Task

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    done = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Permite NULL para tareas pre-existentes
    created_at = db.Column(db.DateTime, default=db.func.now())

    def __repr__(self):
        return f'<Task {self.title}>'

# --- Rutas de Autenticación ---

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "User already exists"}), 409

    new_user = User(username=username)
    new_user.set_password(password) # Usa el método set_password para hashear
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user is None or not user.check_password(password):
        return jsonify({"msg": "Bad username or password"}), 401

    access_token = create_access_token(identity=str(user.id)) # Crea el token JWT
    return jsonify(access_token=access_token), 200

# --- Rutas de Tareas (Protegidas por JWT) ---

@app.route('/tasks', methods=['GET'])
@jwt_required() # Requiere un token JWT válido
def get_tasks():
    current_user_id = get_jwt_identity() # Obtiene el ID del usuario del token JWT
    tasks = Task.query.filter_by(user_id=current_user_id).all() # Filtra tareas por el ID del usuario logueado
    output = []
    for task in tasks:
        task_data = {'id': task.id, 'title': task.title, 'done': task.done, 'user_id': task.user_id}
        output.append(task_data)
    return jsonify(output)

@app.route('/tasks', methods=['POST'])
@jwt_required() # Requiere un token JWT válido
def add_task():
    current_user_id = get_jwt_identity() # Obtiene el ID del usuario del token JWT
    data = request.get_json()
    title = data.get('title')

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    new_task = Task(title=title, user_id=current_user_id) # Asigna la tarea al usuario actual
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"msg": "Task added successfully", "id": new_task.id, "title": new_task.title, "done": new_task.done, "user_id": new_task.user_id}), 201

@app.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required() # Requiere un token JWT válido
def update_task(task_id):
    current_user_id = get_jwt_identity() # Obtiene el ID del usuario del token JWT
    # Busca la tarea por ID y asegúrate de que pertenezca al usuario actual
    task = Task.query.filter_by(id=task_id, user_id=current_user_id).first()

    if not task:
        return jsonify({"msg": "Task not found or you don't have permission"}), 404

    data = request.get_json()
    task.title = data.get('title', task.title)
    task.done = data.get('done', task.done)
    db.session.commit()
    return jsonify({"msg": "Task updated successfully", "id": task.id, "title": task.title, "done": task.done, "user_id": task.user_id})

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required() # Requiere un token JWT válido
def delete_task(task_id):
    current_user_id = get_jwt_identity() # Obtiene el ID del usuario del token JWT
    # Busca la tarea por ID y asegúrate de que pertenezca al usuario actual
    task = Task.query.filter_by(id=task_id, user_id=current_user_id).first()

    if not task:
        return jsonify({"msg": "Task not found or you don't have permission"}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"msg": "Task deleted successfully"})

if __name__ == '__main__':
    app.run(debug=True)