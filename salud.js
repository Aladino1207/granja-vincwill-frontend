const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarSalud() {
  try {
    const res = await fetch(`${API_URL}/salud`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const salud = await res.json();
    const tbody = document.getElementById('saludTableBody');
    tbody.innerHTML = '';
    salud.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.loteId}</td>
        <td>${s.tipo}</td>
        <td>${s.nombre}</td>
        <td>${s.cantidad}</td>
        <td>${new Date(s.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="editarSalud(${s.id})">Editar</button>
          <button onclick="eliminarSalud(${s.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar salud:', error);
  }
}

async function guardarSalud(e) {
  e.preventDefault();
  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: document.getElementById('tipo').value,
    nombre: document.getElementById('nombre').value,
    cantidad: parseInt(document.getElementById('cantidad').value),
    fecha: document.getElementById('fecha').value
  };
  try {
    const res = await fetch(`${API_URL}/salud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(salud)
    });
    if (res.ok) {
      document.getElementById('saludForm').reset();
      cargarSalud();
    } else {
      alert('Error al guardar evento de salud');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarSalud(id) {
  try {
    const res = await fetch(`${API_URL}/salud/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const s = await res.json();
    document.getElementById('loteId').value = s.loteId;
    document.getElementById('tipo').value = s.tipo;
    document.getElementById('nombre').value = s.nombre;
    document.getElementById('cantidad').value = s.cantidad;
    document.getElementById('fecha').value = s.fecha.split('T')[0];
    document.getElementById('saludForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/salud/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(s)
      });
      document.getElementById('saludForm').reset();
      document.getElementById('saludForm').onsubmit = guardarSalud;
      cargarSalud();
    };
  } catch (error) {
    console.error('Error al editar salud:', error);
  }
}

async function eliminarSalud(id) {
  if (confirm('¿Seguro que quieres eliminar este evento de salud?')) {
    try {
      await fetch(`${API_URL}/salud/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarSalud();
    } catch (error) {
      alert('Error al eliminar evento de salud');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('saludForm').style.display = 'grid';
    document.getElementById('saludTable').style.display = 'table';
  }
  cargarSalud();
});