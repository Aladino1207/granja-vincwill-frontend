let allGranjas = []; // Guardar lista de granjas

// --- Lógica de Carga (Global, NO se filtra por granjaId) ---
async function cargarUsuarios() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const usuarios = await res.json();
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    usuarios.forEach(usuario => {
      const tr = document.createElement('tr');

      const granjasNombres = usuario.Granjas && usuario.Granjas.length > 0
        ? usuario.Granjas.map(g => `<span class="badge">${g.nombre}</span>`).join(' ')
        : '<span style="color: #999; font-style: italic;">Sin asignar</span>';

      const granjaIds = usuario.Granjas ? JSON.stringify(usuario.Granjas.map(g => g.id)) : '[]';
      const safeName = usuario.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

      tr.innerHTML = `
        <td>${usuario.name}</td>
        <td>${usuario.email}</td>
        <td>${usuario.role}</td>
        <td>${granjasNombres}</td>
        <td>
          <div style="display: flex; gap: 5px; justify-content: flex-end;">
            <button onclick="editarUsuario(${usuario.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;" title="Editar Datos">✏️</button>
            <button onclick='abrirAsignacion(${usuario.id}, "${safeName}", ${granjaIds})' class="btn btn-sm btn-primario" style="background-color: #34495e;" title="Asignar Granjas">🏠 Asignar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
}

// V 3.0: Cargar todas las granjas existentes (para asignarlas)
async function cargarTodasGranjas() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/granjas/todas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      allGranjas = await res.json();
      renderGranjasTable();
    }
  } catch (error) { console.error(error); }
}

function renderGranjasTable() {
  const tbody = document.getElementById('tablaGranjasBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (allGranjas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No hay granjas registradas.</td></tr>';
    return;
  }
  allGranjas.forEach(g => {
    // AQUÍ ESTABAN FALTANDO LOS BOTONES EN LA VERSIÓN ANTERIOR
    tbody.innerHTML += `
            <tr>
                <td><strong>${g.nombre}</strong></td>
                <td>${g.ubicacion || '-'}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editarGranja(${g.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">✏️</button>
                        <button onclick="eliminarGranja(${g.id})" class="btn btn-sm btn-peligro">🗑️</button>
                    </div>
                </td>
            </tr>`;
  });
}

// --- LÓGICA DEL MODAL DE CHECKBOXES ---

function abrirAsignacion(userId, userName, userGranjasIds) {
  const modal = document.getElementById('asignarModal');
  const container = document.getElementById('granjasCheckboxes');
  document.getElementById('asignarTitle').textContent = `Asignar Granjas a: ${userName}`;
  document.getElementById('assignUserId').value = userId;

  container.innerHTML = '';

  if (allGranjas.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#666;">No hay granjas disponibles para asignar.</p>';
  } else {
    allGranjas.forEach(granja => {
      const tieneAcceso = userGranjasIds.map(id => parseInt(id)).includes(parseInt(granja.id));
      const checkedAttr = tieneAcceso ? 'checked' : '';
      const bgStyle = tieneAcceso ? 'background-color: #e8f8f5;' : '';

      const div = document.createElement('div');
      div.style.cssText = `display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee; border-radius: 4px; ${bgStyle}`;

      div.innerHTML = `
                <input type="checkbox" id="chk_granja_${granja.id}" value="${granja.id}" ${checkedAttr} style="width: 18px; height: 18px; margin-right: 10px; cursor: pointer;">
                <label for="chk_granja_${granja.id}" style="cursor: pointer; width: 100%; font-size: 0.95rem;">
                    ${granja.nombre} 
                    <span style="color: #999; font-size: 0.8rem; margin-left: 5px;">(${granja.ubicacion || 'Sin ubicación'})</span>
                </label>
            `;
      const input = div.querySelector('input');
      input.addEventListener('change', (e) => {
        div.style.backgroundColor = e.target.checked ? '#e8f8f5' : 'transparent';
      });
      container.appendChild(div);
    });
  }
  modal.classList.add('is-open');
}

// Guardar la selección de checkboxes
async function guardarAsignacion(e) {
  e.preventDefault();
  const userId = document.getElementById('assignUserId').value;
  const checkboxes = document.querySelectorAll('#granjasCheckboxes input[type="checkbox"]:checked');
  const granjaIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/users/${userId}/asignar-granjas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ granjaIds })
    });

    if (res.ok) {
      document.getElementById('asignarModal').classList.remove('is-open');
      alert('Permisos actualizados correctamente.');
      cargarUsuarios();
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'No se pudo guardar'));
    }
  } catch (err) { alert('Error de conexión'); }
  finally { btn.textContent = originalText; btn.disabled = false; }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE (Usuarios) ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Crear Nuevo Usuario';
  document.getElementById('userForm').reset();
  document.getElementById('usuarioId').value = '';
  document.getElementById('formTitle').textContent = 'Crear Nuevo Usuario';
}

// --- Funciones CRUD (Globales, NO se filtran) ---
async function guardarUsuario(e) {
  e.preventDefault();
  const usuarioId = document.getElementById('usuarioId').value;
  const esEdicion = !!usuarioId;
  const passwordInput = document.getElementById('password').value;

  const usuario = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    role: document.getElementById('role').value,
    password: passwordInput ? passwordInput : undefined
  };

  if (!esEdicion && !usuario.password) {
    alert('La contraseña es obligatoria para crear un nuevo usuario.');
    return;
  }

  const url = esEdicion ? `${window.API_URL}/users/${usuarioId}` : `${window.API_URL}/users`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(usuario)
    });
    if (res.ok) {
      cerrarFormulario();
      cargarUsuarios();
    } else {
      const errorData = await res.json();
      alert('Error al guardar usuario: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) { alert('Error de conexión'); }
}

async function editarUsuario(id) {
  console.log("Editando usuario ID:", id); // Debug
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el usuario');
    const usuario = await res.json();

    // Poblar formulario
    document.getElementById('formTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('name').value = usuario.name;
    document.getElementById('email').value = usuario.email;
    document.getElementById('role').value = usuario.role;
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = 'Dejar en blanco para no cambiar';

    // Abrir formulario y subir scroll
    abrirFormulario();
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) { console.error('Error al cargar datos para editar:', error); }
}

// --- V 3.0: Lógica de Creación de Granjas ---
async function guardarGranja(e) {
  e.preventDefault();
  const granjaId = document.getElementById('granjaId').value;
  const esEdicion = !!granjaId;

  const granja = {
    nombre: document.getElementById('granjaNombre').value,
    ubicacion: document.getElementById('granjaUbicacion').value
  };

  const url = esEdicion ? `${window.API_URL}/granjas/${granjaId}` : `${window.API_URL}/granjas`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(granja)
    });
    if (res.ok) {
      resetGranjaForm();
      cargarTodasGranjas();
      alert(esEdicion ? "Granja actualizada." : "Granja creada.");
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || 'Desconocido'));
    }
  } catch (e) { alert("Error de conexión"); }
}

function editarGranja(id) {
  // Buscar la granja en el array local (más rápido)
  const granja = allGranjas.find(g => g.id === id);
  if (granja) {
    document.getElementById('granjaId').value = granja.id;
    document.getElementById('granjaNombre').value = granja.nombre;
    document.getElementById('granjaUbicacion').value = granja.ubicacion;

    document.getElementById('granjaFormTitle').textContent = 'Editar Granja';
    document.getElementById('cancelGranjaBtn').style.display = 'inline-block';

    // Scroll suave hacia el formulario de granja
    const form = document.getElementById('granjaForm');
    form.scrollIntoView({ behavior: 'smooth' });
  }
}

async function eliminarGranja(id) {
  if (confirm("¿Estás seguro? Esto eliminará TODOS los datos (lotes, ventas, costos) asociados a esta granja permanentemente.")) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${window.API_URL}/granjas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) cargarTodasGranjas();
      else alert("No se pudo eliminar");
    } catch (e) { alert("Error de conexión"); }
  }
}

function resetGranjaForm() {
  document.getElementById('granjaForm').reset();
  document.getElementById('granjaId').value = '';
  document.getElementById('granjaFormTitle').textContent = 'Gestionar Granjas';
  document.getElementById('cancelGranjaBtn').style.display = 'none';
}


// --- V 3.0: Lógica de Asignación de Granjas ---
async function asignarGranjas(userId, userName) {
  // Esta es una función de demostración.
  // En V 3.1, esto debería abrir un modal con checkboxes

  console.log('Asignar granjas a:', userName);
  console.log('Granjas disponibles:', allGranjas);

  // Ejemplo de cómo asignarías la PRIMERA granja de la lista
  if (allGranjas.length > 0) {
    const granjaAAsignar = allGranjas[0]; // Asignamos la primera por defecto
    if (confirm(`¿Asignar "${granjaAAsignar.nombre}" a ${userName}?`)) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/granjas/asignar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId: userId, granjaId: granjaAAsignar.id })
        });
        if (!res.ok) throw new Error('No se pudo asignar');
        alert('¡Asignado!');
      } catch (err) {
        alert('Error al asignar granja');
      }
    }
  } else {
    alert('No hay granjas en el sistema para asignar.');
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const userForm = document.getElementById('userForm');
  const formContainer = document.getElementById('formContainer');

  const adminSection = document.getElementById('adminSection');
  const userSection = document.getElementById('userSection');
  const accessDenied = document.getElementById('accessDenied');

  const granjaForm = document.getElementById('granjaForm');
  const cancelGranjaBtn = document.getElementById('cancelGranjaBtn');

  const asignarModal = document.getElementById('asignarModal');
  const closeAsignar = document.getElementById('closeAsignarModal');
  const formAsignar = document.getElementById('asignarForm');

  if (currentUser && currentUser.role === 'admin') {
    if (userSection) userSection.style.display = 'block';
    if (adminSection) adminSection.style.display = 'grid';
    if (accessDenied) accessDenied.style.display = 'none';

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const isOpen = formContainer.classList.contains('is-open');
        if (isOpen) cerrarFormulario(); else {
          document.getElementById('userForm').reset();
          document.getElementById('usuarioId').value = '';
          document.getElementById('formTitle').textContent = 'Crear Nuevo Usuario';
          abrirFormulario();
        }
      };
    }
    if (cancelBtn) cancelBtn.onclick = cerrarFormulario;
    if (userForm) userForm.onsubmit = guardarUsuario;

    if (granjaForm) granjaForm.onsubmit = guardarGranja;
    if (cancelGranjaBtn) cancelGranjaBtn.onclick = resetGranjaForm;

    if (closeAsignar) closeAsignar.onclick = () => asignarModal.classList.remove('is-open');
    if (formAsignar) formAsignar.onsubmit = guardarAsignacion;

    cargarUsuarios();
    cargarTodasGranjas();

  } else {
    if (accessDenied) accessDenied.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
  }
});