// --- Configuración General (BLINDADA) ---
async function cargarConfiguracion() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    // El backend (index.js) se encarga de 'findOrCreate' si no existe
    const res = await fetch(`${window.API_URL}/config?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const config = await res.json();

    // Rellenamos el formulario de config
    document.getElementById('notificaciones').value = config.notificaciones;
    document.getElementById('idioma').value = config.idioma;
    document.getElementById('nombreGranja').value = config.nombreGranja;

  } catch (error) {
    console.error('Error al cargar config:', error);
  }
}

async function guardarConfiguracion(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const config = {
    notificaciones: document.getElementById('notificaciones').value,
    idioma: document.getElementById('idioma').value,
    nombreGranja: document.getElementById('nombreGranja').value,
    granjaId: granjaId // V 3.0: Añadido
  };
  try {
    // El backend (index.js) sabe que este POST es un "guardar o actualizar"
    const res = await fetch(`${window.API_URL}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      alert('Ajustes guardados');
      // Actualizar el nombre de la granja en el header
      document.querySelector('header h1').textContent = `Configuración (${config.nombreGranja})`;
      // Actualizar el nombre en localStorage para que el sidebar se actualice al recargar
      const granjaData = JSON.parse(localStorage.getItem('selectedGranja'));
      if (granjaData) {
        granjaData.nombre = config.nombreGranja;
        localStorage.setItem('selectedGranja', JSON.stringify(granjaData));
      }
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

// --- Lógica de Agenda (BLINDADA) ---
async function cargarAgenda() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch (endpoint /agenda)
    const res = await fetch(`${window.API_URL}/agenda?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
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
      // Usamos timeZone: 'UTC' para evitar corrimiento de fechas
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
  const token = localStorage.getItem('token');
  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const nuevoEvento = {
    descripcion: document.getElementById('descEvento').value,
    fecha: document.getElementById('fechaEvento').value,
    granjaId: granjaId // V 3.0: Añadido
  };

  try {
    const res = await fetch(`${window.API_URL}/agenda`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(nuevoEvento)
    });
    if (res.ok) {
      document.getElementById('agendaForm').reset();
      cargarAgenda(); // Recarga la lista
    } else {
      alert('Error al guardar evento');
    }
  } catch (error) {
    console.error(error);
  }
}

async function eliminarEvento(id) {
  if (confirm('¿Borrar esta actividad de la agenda?')) {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    await fetch(`${window.API_URL}/agenda/${id}?granjaId=${granjaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    cargarAgenda();
  }
}

// --- Inicialización (BLINDADA) ---
document.addEventListener('DOMContentLoaded', () => {
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Configuración (${granja.nombre})`;
  }

  // Cargar datos
  cargarConfiguracion();
  cargarAgenda();

  // Vincular formularios
  document.getElementById('configForm').onsubmit = guardarConfiguracion;
  document.getElementById('agendaForm').onsubmit = guardarEvento;
});