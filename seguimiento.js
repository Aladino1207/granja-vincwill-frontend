

async function cargarSeguimiento() {
  try {
    const res = await fetch(`${API_URL}/seguimiento`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const seguimiento = await res.json();
    const tbody = document.getElementById('seguimientoTableBody');
    tbody.innerHTML = '';
    seguimiento.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.loteId}</td>
        <td>${s.semana}</td>
        <td>${s.peso}</td>
        <td>${s.consumo}</td>
        <td>${s.observaciones || 'N/A'}</td>
        <td>${new Date(s.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="editarSeguimiento(${s.id})">Editar</button>
          <button onclick="eliminarSeguimiento(${s.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar seguimiento:', error);
  }
}

async function guardarSeguimiento(e) {
  e.preventDefault();
  const seguimiento = {
    loteId: parseInt(document.getElementById('loteId').value),
    semana: parseInt(document.getElementById('semana').value),
    peso: parseFloat(document.getElementById('peso').value),
    consumo: parseFloat(document.getElementById('consumo').value),
    observaciones: document.getElementById('observaciones').value,
    fecha: document.getElementById('fecha').value
  };
  try {
    const res = await fetch(`${API_URL}/seguimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(seguimiento)
    });
    if (res.ok) {
      document.getElementById('seguimientoForm').reset();
      cargarSeguimiento();
    } else {
      alert('Error al guardar seguimiento');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarSeguimiento(id) {
  try {
    const res = await fetch(`${API_URL}/seguimiento/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const s = await res.json();
    document.getElementById('loteId').value = s.loteId;
    document.getElementById('semana').value = s.semana;
    document.getElementById('peso').value = s.peso;
    document.getElementById('consumo').value = s.consumo;
    document.getElementById('observaciones').value = s.observaciones || '';
    document.getElementById('fecha').value = s.fecha.split('T')[0];
    document.getElementById('seguimientoForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/seguimiento/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(s)
      });
      document.getElementById('seguimientoForm').reset();
      document.getElementById('seguimientoForm').onsubmit = guardarSeguimiento;
      cargarSeguimiento();
    };
  } catch (error) {
    console.error('Error al editar seguimiento:', error);
  }
}

async function eliminarSeguimiento(id) {
  if (confirm('¿Seguro que quieres eliminar este seguimiento?')) {
    try {
      await fetch(`${API_URL}/seguimiento/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarSeguimiento();
    } catch (error) {
      alert('Error al eliminar seguimiento');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('seguimientoForm').style.display = 'grid';
    document.getElementById('seguimientoTable').style.display = 'table';
  }
  cargarSeguimiento();
});