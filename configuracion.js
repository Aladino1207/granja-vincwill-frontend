async function cargarConfiguracion() {
  try {
    const res = await fetch(`${window.API_URL}/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const config = await res.json();
    if (config.length > 0) {
      document.getElementById('notificaciones').value = config[0].notificaciones;
      document.getElementById('idioma').value = config[0].idioma;
      document.getElementById('nombreGranja').value = config[0].nombreGranja;
    }
  } catch (error) {
    console.error('Error al cargar config:', error);
  }
}

async function guardarConfiguracion(e) {
  e.preventDefault();
  // Enviamos vacunasGallinas vacío porque ya no usamos el sistema viejo
  const config = {
    notificaciones: document.getElementById('notificaciones').value,
    idioma: document.getElementById('idioma').value,
    nombreGranja: document.getElementById('nombreGranja').value,
    vacunasGallinas: ''
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
    if (res.ok) alert('Ajustes generales guardados');
  } catch (error) {
    alert('Error de conexión');
  }
}

// --- NUEVA: Lógica de Agenda Manual ---
async function cargarAgenda() {
  try {
    const res = await fetch(`${window.API_URL}/agenda`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const eventos = await res.json();
    const tbody = document.getElementById('tablaAgendaBody');
    tbody.innerHTML = '';

    if (eventos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No hay actividades programadas.</td></tr>';
      return;
    }

    eventos.forEach(ev => {
      const tr = document.createElement('tr');
      // Formateamos la fecha para que se vea amigable
      const fechaFormat = new Date(ev.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' });

      tr.innerHTML = `
                <td>${fechaFormat}</td>
                <td>${ev.descripcion}</td>
                <td><button onclick="eliminarEvento(${ev.id})" class="btn btn-sm btn-peligro">Borrar</button></td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando agenda:', error);
  }
}

async function guardarEvento(e) {
  e.preventDefault();
  const nuevoEvento = {
    descripcion: document.getElementById('descEvento').value,
    fecha: document.getElementById('fechaEvento').value
  };

  try {
    const res = await fetch(`${window.API_URL}/agenda`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(nuevoEvento)
    });
    if (res.ok) {
      document.getElementById('agendaForm').reset();
      cargarAgenda(); // Recarga la lista inmediatamente
    } else {
      alert('Error al guardar el evento');
    }
  } catch (error) {
    console.error(error);
  }
}

async function eliminarEvento(id) {
  if (confirm('¿Borrar esta actividad de la agenda?')) {
    await fetch(`${window.API_URL}/agenda/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    cargarAgenda();
  }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracion();
  cargarAgenda(); // <--- Carga tus tareas

  document.getElementById('configForm').onsubmit = guardarConfiguracion;
  document.getElementById('agendaForm').onsubmit = guardarEvento; // <--- Vincula el nuevo form
});