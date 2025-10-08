async function cargarConfiguracion() {
  try {
    const res = await fetch(`${window.API_URL}/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const configs = await res.json();
    const form = document.getElementById('configForm');
    const tbody = document.getElementById('configTableBody');
    tbody.innerHTML = '';

    if (configs.length > 0) {
      const config = configs[0]; // Asume la primera configuración como activa
      document.getElementById('notificaciones').value = config.notificaciones;
      document.getElementById('idioma').value = config.idioma;
      document.getElementById('nombreGranja').value = config.nombreGranja;
      document.getElementById('umbralMortalidad').value = config.umbralMortalidad || 10;
      document.getElementById('formatoFecha').value = config.formatoFecha || 'dd/MM/yyyy';

      // Cargar vacunas
      const vacunas = {
        gallinas: config.vacunasGallinas ? config.vacunasGallinas.split(',').map(v => v.trim()) : [],
        pollos: config.vacunasPollos ? config.vacunasPollos.split(',').map(v => v.trim()) : [],
        pavos: config.vacunasPavos ? config.vacunasPavos.split(',').map(v => v.trim()) : []
      };
      const vacunasBody = document.getElementById('vacunasBody');
      vacunasBody.innerHTML = '';
      for (const [tipo, lista] of Object.entries(vacunas)) {
        lista.forEach(v => {
          const [semana, nombre] = v.split(':').map(s => s.trim());
          agregarFilaVacuna(tipo, semana, nombre);
        });
      }

      // Mostrar configuraciones existentes
      configs.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.nombreGranja}</td>
          <td>${c.notificaciones}</td>
          <td>${c.idioma}</td>
          <td>
            <button onclick="editarConfiguracion(${c.id})">Editar</button>
            <button onclick="eliminarConfiguracion(${c.id})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    document.getElementById('mensaje').textContent = 'Error al cargar configuración.';
  }
}

function agregarVacuna() {
  agregarFilaVacuna('Gallinas', '', '');
}

function agregarFilaVacuna(tipo, semana = '', nombre = '') {
  const tbody = document.getElementById('vacunasBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><select><option ${tipo === 'Gallinas' ? 'selected' : ''} value="Gallinas">Gallinas</option><option ${tipo === 'Pollos' ? 'selected' : ''} value="Pollos">Pollos</option><option ${tipo === 'Pavos' ? 'selected' : ''} value="Pavos">Pavos</option></select></td>
    <td><input type="number" value="${semana}" min="1"></td>
    <td><input type="text" value="${nombre}"></td>
    <td><button type="button" onclick="this.parentNode.parentNode.remove()">Eliminar</button></td>
  `;
  tbody.appendChild(tr);
}

async function guardarConfiguracion(e) {
  e.preventDefault();
  const notificaciones = document.getElementById('notificaciones').value;
  const idioma = document.getElementById('idioma').value;
  const nombreGranja = document.getElementById('nombreGranja').value.trim();
  const umbralMortalidad = parseInt(document.getElementById('umbralMortalidad').value);
  const formatoFecha = document.getElementById('formatoFecha').value;

  if (!nombreGranja) {
    document.getElementById('mensaje').textContent = 'El nombre de la granja es obligatorio.';
    return;
  }

  const vacunas = {};
  document.querySelectorAll('#vacunasBody tr').forEach(tr => {
    const tipo = tr.querySelector('select').value;
    const semana = tr.querySelector('input[type="number"]').value;
    const nombre = tr.querySelector('input[type="text"]').value;
    if (semana && nombre) {
      vacunas[tipo] = vacunas[tipo] || [];
      vacunas[tipo].push(`${semana}: ${nombre}`);
    }
  });

  const config = {
    notificaciones,
    idioma,
    nombreGranja,
    umbralMortalidad,
    formatoFecha,
    vacunasGallinas: vacunas.Gallinas ? vacunas.Gallinas.join(', ') : '',
    vacunasPollos: vacunas.Pollos ? vacunas.Pollos.join(', ') : '',
    vacunasPavos: vacunas.Pavos ? vacunas.Pavos.join(', ') : ''
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
      document.getElementById('mensaje').textContent = 'Configuración guardada con éxito.';
      document.getElementById('configForm').reset();
      document.getElementById('vacunasBody').innerHTML = '';
      cargarConfiguracion();
    } else {
      document.getElementById('mensaje').textContent = 'Error al guardar configuración.';
    }
  } catch (error) {
    document.getElementById('mensaje').textContent = 'Error de conexión.';
  }
}

async function editarConfiguracion(id) {
  try {
    const res = await fetch(`${window.API_URL}/config/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const config = await res.json();
    document.getElementById('notificaciones').value = config.notificaciones;
    document.getElementById('idioma').value = config.idioma;
    document.getElementById('nombreGranja').value = config.nombreGranja;
    document.getElementById('umbralMortalidad').value = config.umbralMortalidad || 10;
    document.getElementById('formatoFecha').value = config.formatoFecha || 'dd/MM/yyyy';
    document.getElementById('vacunasBody').innerHTML = '';
    const vacunas = {
      Gallinas: config.vacunasGallinas.split(',').map(v => v.trim()),
      Pollos: config.vacunasPollos.split(',').map(v => v.trim()),
      Pavos: config.vacunasPavos.split(',').map(v => v.trim())
    };
    for (const [tipo, lista] of Object.entries(vacunas)) {
      lista.forEach(v => {
        const [semana, nombre] = v.split(':').map(s => s.trim());
        agregarFilaVacuna(tipo, semana, nombre);
      });
    }
  } catch (error) {
    console.error('Error al editar configuración:', error);
  }
}

async function eliminarConfiguracion(id) {
  if (confirm('¿Seguro que quieres eliminar esta configuración?')) {
    try {
      const res = await fetch(`${window.API_URL}/config/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        cargarConfiguracion();
        document.getElementById('mensaje').textContent = 'Configuración eliminada.';
      } else {
        document.getElementById('mensaje').textContent = 'Error al eliminar configuración.';
      }
    } catch (error) {
      document.getElementById('mensaje').textContent = 'Error de conexión.';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('configForm').style.display = 'grid';
    document.getElementById('configTable').style.display = 'table';
  }
  cargarConfiguracion();
});