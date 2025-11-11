async function cargarConfiguracion() {
  try {
    const res = await fetch(`${window.API_URL}/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const config = await res.json();
    const form = document.getElementById('configForm');
    if (config.length > 0) {
      document.getElementById('notificaciones').value = config[0].notificaciones;
      document.getElementById('idioma').value = config[0].idioma;
      document.getElementById('nombreGranja').value = config[0].nombreGranja;
      document.getElementById('vacunasGallinas').value = config[0].vacunasGallinas;
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error);
  }
}

async function guardarConfiguracion(e) {
  e.preventDefault();
  const config = {
    notificaciones: document.getElementById('notificaciones').value,
    idioma: document.getElementById('idioma').value,
    nombreGranja: document.getElementById('nombreGranja').value,
    vacunasGallinas: document.getElementById('vacunasGallinas').value
  };
  try {
    const res = await fetch(`${window.API_URL}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      document.getElementById('configForm').reset();
      cargarConfiguracion();
      alert('Configuración guardada');
    } else {
      alert('Error al guardar configuración');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('configForm').style.display = 'grid';
  }
  cargarConfiguracion();
});