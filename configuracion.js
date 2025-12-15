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

  // 1. Validar que el elemento hidden exista (por si acaso no actualizaste el HTML)
  const logoInput = document.getElementById('logoBase64');
  if (!logoInput) {
    alert("Error: No se encontró el campo oculto 'logoBase64'. Revisa tu HTML.");
    return;
  }

  const config = {
    notificaciones: document.getElementById('notificaciones').value,
    idioma: document.getElementById('idioma').value,
    nombreGranja: document.getElementById('nombreGranja').value,
    planVacunacion: document.getElementById('planVacunacion').value,
    logoUrl: logoInput.value,
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

      // Actualizar el logo en el header
      const logoHeader = document.querySelector('.app-logo-img');
      if (logoHeader && config.logoUrl) logoHeader.src = config.logoUrl;

      // Actualizar caché de config
      const configLocal = JSON.parse(localStorage.getItem('granjaConfig')) || {};
      configLocal.logoUrl = config.logoUrl;
      localStorage.setItem('granjaConfig', JSON.stringify(configLocal));

      // --- CORRECCIÓN AQUÍ: Definir granjaData antes de usarlo ---
      const granjaData = JSON.parse(localStorage.getItem('selectedGranja'));

      if (granjaData) {
        granjaData.nombre = config.nombreGranja;
        localStorage.setItem('selectedGranja', JSON.stringify(granjaData));
      }

      // Opcional: Recargar para ver cambios
      // window.location.reload(); 
    } else {
      // Si el servidor responde con error (ej: imagen muy grande)
      const errorText = await res.text();
      console.error("Error del servidor:", errorText);
      alert('Error al guardar: ' + res.status + '. Revisa la consola.');
    }
  } catch (error) {
    console.error(error); // Ver el error real en consola
    alert('Error de conexión o de código (Revisa la consola F12)');
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

// --- FUNCIONES DE BACKUP ---

async function exportarBackup() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser.role !== 'admin') {
    alert("Solo el administrador puede exportar datos.");
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnExportar');
    btn.textContent = "Generando archivo...";
    btn.disabled = true;

    const res = await fetch(`${window.API_URL}/backup/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al descargar');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Nombre del archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    a.download = `VincWill_Backup_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    btn.textContent = "💾 Descargar Copia de Seguridad";
    btn.disabled = false;

  } catch (error) {
    console.error(error);
    alert("Error al generar el backup.");
    document.getElementById('btnExportar').disabled = false;
  }
}

async function importarBackup() {
  const fileInput = document.getElementById('backupInput');
  const file = fileInput.files[0];

  if (!file) {
    alert("Por favor selecciona un archivo .json primero.");
    return;
  }

  if (!confirm("⚠️ ¡ADVERTENCIA CRÍTICA! ⚠️\n\nEsta acción BORRARÁ TODOS los datos actuales de esta base de datos y los reemplazará con los del archivo.\n\n¿Estás seguro de que esta es una base de datos nueva o que quieres sobrescribir todo?")) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const jsonData = JSON.parse(e.target.result);
      const token = localStorage.getItem('token');
      const btn = document.getElementById('btnImportar');

      btn.textContent = "Restaurando... (No cierres)";
      btn.disabled = true;

      const res = await fetch(`${window.API_URL}/backup/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(jsonData) // Enviamos el JSON completo
      });

      const result = await res.json();

      if (res.ok) {
        alert(result.message);
        localStorage.clear(); // Limpiar sesión local para evitar conflictos
        window.location.href = 'login.html';
      } else {
        alert("Error: " + (result.error || "Desconocido"));
      }

    } catch (error) {
      console.error(error);
      alert("El archivo no es un JSON válido o es demasiado grande.");
    } finally {
      document.getElementById('btnImportar').textContent = "⚠️ Restaurar Backup";
      document.getElementById('btnImportar').disabled = false;
    }
  };
  reader.readAsText(file);
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

  const btnExp = document.getElementById('btnExportar');
  if (btnExp) btnExp.addEventListener('click', exportarBackup);

  const btnImp = document.getElementById('btnImportar');
  if (btnImp) btnImp.addEventListener('click', importarBackup);

  // Cargar datos
  cargarConfiguracion();
  cargarAgenda();

  // Vincular formularios
  document.getElementById('configForm').onsubmit = guardarConfiguracion;
  document.getElementById('agendaForm').onsubmit = guardarEvento;
});