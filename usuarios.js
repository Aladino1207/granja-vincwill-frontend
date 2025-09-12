const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarUsuarios() {
  try {
    const res = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const usuarios = await res.json();
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    usuarios.forEach(usuario => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${usuario.name}</td>
        <td>${usuario.email}</td>
        <td>${usuario.role}</td>
        <td>
          <button onclick="editarUsuario(${usuario.id})">Editar</button>
          <button onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
}

async function guardarUsuario(e) {
  e.preventDefault();
  const usuario = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    role: document.getElementById('role').value
  };
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(usuario)
    });
    if (res.ok) {
      document.getElementById('userForm').reset();
      cargarUsuarios();
    } else {
      alert('Error al guardar usuario');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarUsuario(id) {
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const usuario = await res.json();
    document.getElementById('name').value = usuario.name;
    document.getElementById('email').value = usuario.email;
    document.getElementById('password').value = ''; // No se muestra por seguridad
    document.getElementById('role').value = usuario.role;
    document.getElementById('userForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedUser = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value || undefined,
        role: document.getElementById('role').value
      };
      await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedUser)
      });
      document.getElementById('userForm').reset();
      document.getElementById('userForm').onsubmit = guardarUsuario;
      cargarUsuarios();
    };
  } catch (error) {
    console.error('Error al editar usuario:', error);
  }
}

async function eliminarUsuario(id) {
  if (confirm('¿Seguro que quieres eliminar este usuario?')) {
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarUsuarios();
    } catch (error) {
      alert('Error al eliminar usuario');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('userForm').style.display = 'grid';
    document.getElementById('userTable').style.display = 'table';
  } else if (currentUser) {
    document.getElementById('accessDenied').style.display = 'block';
  }
  cargarUsuarios();
});