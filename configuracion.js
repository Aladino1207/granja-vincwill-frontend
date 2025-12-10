// --- Configuración General (BLINDADA) ---
async function cargarConfiguracion() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/config?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const config = await res.json();

    document.getElementById('notificaciones').value = config.notificaciones;
    document.getElementById('idioma').value = config.idioma;
    document.getElementById('nombreGranja').value = config.nombreGranja;
    document.getElementById('planVacunacion').value = config.planVacunacion || "7,14,21";

    // Cargar Logo
    if (config.logoUrl) {
      // Guardamos el valor actual en el hidden por si no lo cambian
      document.getElementById('logoBase64').value = config.logoUrl;
      // Mostramos el preview
      const preview = document.getElementById('logoPreview');
      preview.src = config.logoUrl;
      preview.style.display = 'inline-block';
    }

  } catch (error) { console.error(error); }
}

async function guardarConfiguracion(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const config = {
    notificaciones: document.getElementById('notificaciones').value,
    idioma: document.getElementById('idioma').value,
    nombreGranja: document.getElementById('nombreGranja').value,
    planVacunacion: document.getElementById('planVacunacion').value,
    logoUrl: document.getElementById('logoBase64').value,
    granjaId: granjaId
  };
  try {
    const res = await fetch(`${window.API_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      alert('Ajustes guardados');
      // Actualizar el logo en el header inmediatamente sin recargar
      const logoHeader = document.querySelector('.app-logo-img');
      if (logoHeader && config.logoUrl) logoHeader.src = config.logoUrl;

      // Actualizar localStorage
      const configLocal = JSON.parse(localStorage.getItem('granjaConfig')) || {};
      configLocal.logoUrl = config.logoUrl;
      localStorage.setItem('granjaConfig', JSON.stringify(configLocal));
      if (granjaData) {
        granjaData.nombre = config.nombreGranja;
        localStorage.setItem('selectedGranja', JSON.stringify(granjaData));
      }
    }
  } catch (error) { alert('Error de conexión'); }
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

  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const logoBase64 = document.getElementById('logoBase64');

  if (logoInput) {
    logoInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      // Validación simple de tamaño (ej. 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen es muy pesada (Máx 2MB). Por favor redúcela.");
        this.value = ""; // Limpiar input
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        // El resultado es una cadena larga: "data:image/png;base64,iVBORw0KGgo..."
        const base64String = event.target.result;

        // Mostramos preview
        logoPreview.src = base64String;
        logoPreview.style.display = 'inline-block';

        // Guardamos en el input oculto para enviarlo luego
        logoBase64.value = base64String;
      };
      reader.readAsDataURL(file);
    });
  }

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