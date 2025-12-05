let allGranjas = []; // Lista maestra de granjas

// ==========================================
// 1. GESTIÓN DE USUARIOS (LÓGICA)
// ==========================================

// --- Carga de Usuarios ---
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
        ? usuario.Granjas.map(g => `<span class="badge" style="background:#ecf0f1; color:#333; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:4px;">${g.nombre}</span>`).join('')
        : '<span style="color: #999; font-style: italic;">Sin asignar</span>';

      const granjaIds = usuario.Granjas ? JSON.stringify(usuario.Granjas.map(g => g.id)) : '[]';
      const safeName = usuario.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

      tr.innerHTML = `
        <td><strong>${usuario.name}</strong></td>
        <td>${usuario.email}</td>
        <td><span class="badge">${usuario.role}</span></td>
        <td>${granjasNombres}</td>
        <td>
          <div style="display: flex; gap: 5px; justify-content: flex-end;">
            <button onclick="editarUsuario(${usuario.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;" title="Editar Usuario">✏️</button>
            <button onclick='abrirAsignacion(${usuario.id}, "${safeName}", ${granjaIds})' class="btn btn-sm btn-primario" style="background-color: #34495e;" title="Asignar Granjas">🏠</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error('Error al cargar usuarios:', error); }
}

// --- UI Usuarios (ARREGLADO: Nombres específicos) ---
function abrirFormularioUsuario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';
}

function cerrarFormularioUsuario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Crear Nuevo Usuario';

  document.getElementById('userForm').reset();
  document.getElementById('usuarioId').value = '';
  document.getElementById('formTitle').textContent = 'Crear Nuevo Usuario';
}

// --- CRUD Usuarios ---
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
    alert('La contraseña es obligatoria para nuevos usuarios.');
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
      cerrarFormularioUsuario();
      cargarUsuarios();
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'Desconocido'));
    }
  } catch (error) { alert('Error de conexión'); }
}

async function editarUsuario(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error');
    const usuario = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('name').value = usuario.name;
    document.getElementById('email').value = usuario.email;
    document.getElementById('role').value = usuario.role;
    document.getElementById('password').value = '';

    abrirFormularioUsuario();
    // Scroll suave hacia el formulario
    document.getElementById('formContainer').scrollIntoView({ behavior: 'smooth' });
  } catch (error) { console.error(error); }
}

async function eliminarUsuario(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.")) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/users/${id}`, { // Asegúrate que tu backend tenga app.delete('/users/:id')
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      cargarUsuarios();
    } else {
      const err = await res.json();
      alert("Error al eliminar: " + (err.error || "Desconocido"));
    }
  } catch (e) {
    alert("Error de conexión");
    console.error(e);
  }
}

// ==========================================
// 2. GESTIÓN DE GRANJAS (LÓGICA)
// ==========================================

async function cargarTodasGranjas() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/granjas/todas`, { headers: { Authorization: `Bearer ${token}` } });
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
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || 'Desconocido'));
    }
  } catch (e) { alert("Error de conexión"); }
}

function editarGranja(id) {
  const granja = allGranjas.find(g => g.id === id);
  if (granja) {
    document.getElementById('granjaId').value = granja.id;
    document.getElementById('granjaNombre').value = granja.nombre;
    document.getElementById('granjaUbicacion').value = granja.ubicacion;

    // Cambiar estado del formulario de granja
    // Nota: Usamos un h2 cercano o creamos lógica visual
    const btnGuardar = document.querySelector('#granjaForm button[type="submit"]');
    if (btnGuardar) btnGuardar.textContent = 'Actualizar';

    const cancelBtn = document.getElementById('cancelGranjaBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    document.getElementById('granjaForm').scrollIntoView({ behavior: 'smooth' });
  }
}

async function eliminarGranja(id) {
  if (confirm("¿Estás seguro? Esto eliminará TODOS los datos asociados a esta granja.")) {
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

  const btnGuardar = document.querySelector('#granjaForm button[type="submit"]');
  if (btnGuardar) btnGuardar.textContent = 'Guardar';

  const cancelBtn = document.getElementById('cancelGranjaBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

// ==========================================
// 3. MODAL DE ASIGNACIÓN (CHECKBOXES)
// ==========================================

function abrirAsignacion(userId, userName, userGranjasIds) {
  const modal = document.getElementById('asignarModal');
  const container = document.getElementById('granjasCheckboxes');
  document.getElementById('asignarTitle').textContent = `Asignar a: ${userName}`;
  document.getElementById('assignUserId').value = userId;

  container.innerHTML = '';

  if (allGranjas.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#666;">No hay granjas disponibles.</p>';
  } else {
    allGranjas.forEach(granja => {
      const tieneAcceso = userGranjasIds.map(id => parseInt(id)).includes(parseInt(granja.id));
      const checkedAttr = tieneAcceso ? 'checked' : '';
      const bgStyle = tieneAcceso ? 'background-color: #e8f8f5;' : '';

      const div = document.createElement('div');
      div.style.cssText = `display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee; border-radius: 4px; ${bgStyle}`;

      div.innerHTML = `
                <input type="checkbox" id="chk_${granja.id}" value="${granja.id}" ${checkedAttr} style="width: 18px; height: 18px; margin-right: 10px; cursor: pointer;">
                <label for="chk_${granja.id}" style="cursor: pointer; width: 100%; font-size: 0.95rem;">
                    ${granja.nombre} 
                    <span style="color: #999; font-size: 0.8rem; margin-left: 5px;">(${granja.ubicacion || 'Sin ubicación'})</span>
                </label>
            `;
      div.querySelector('input').addEventListener('change', (e) => {
        div.style.backgroundColor = e.target.checked ? '#e8f8f5' : 'transparent';
      });
      container.appendChild(div);
    });
  }
  modal.classList.add('is-open');
}

async function guardarAsignacion(e) {
  e.preventDefault();
  const userId = document.getElementById('assignUserId').value;
  const checkboxes = document.querySelectorAll('#granjasCheckboxes input[type="checkbox"]:checked');
  const granjaIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/users/${userId}/asignar-granjas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ granjaIds })
    });
    if (res.ok) {
      document.getElementById('asignarModal').classList.remove('is-open');
      cargarUsuarios();
    } else { alert('Error al guardar asignación'); }
  } catch (err) { alert('Error de conexión'); }
}


// ==========================================
// 4. INICIALIZACIÓN PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const userForm = document.getElementById('userForm');
  const formContainer = document.getElementById('formContainer');

  const granjaForm = document.getElementById('granjaForm');
  const cancelGranjaBtn = document.getElementById('cancelGranjaBtn');

  const closeAsignar = document.getElementById('closeAsignarModal');
  const formAsignar = document.getElementById('asignarForm');

  const adminSection = document.getElementById('adminSection');
  const accessDenied = document.getElementById('accessDenied');

  if (currentUser && currentUser.role === 'admin') {
    // Mostrar interfaz
    if (adminSection) adminSection.style.display = 'grid';
    if (accessDenied) accessDenied.style.display = 'none';

    // --- Configurar Formulario Usuario ---
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const isOpen = formContainer.classList.contains('is-open');
        // AQUÍ ESTÁ LA CORRECCIÓN: Usamos los nombres correctos
        if (isOpen) cerrarFormularioUsuario();
        else {
          document.getElementById('userForm').reset();
          document.getElementById('usuarioId').value = '';
          document.getElementById('formTitle').textContent = 'Crear Nuevo Usuario';
          abrirFormularioUsuario();
        }
      };
    }
    if (cancelBtn) cancelBtn.onclick = cerrarFormularioUsuario;
    if (userForm) userForm.onsubmit = guardarUsuario;

    // --- Configurar Formulario Granja ---
    if (granjaForm) granjaForm.onsubmit = guardarGranja;
    if (cancelGranjaBtn) cancelGranjaBtn.onclick = resetGranjaForm;

    // --- Configurar Modal Asignación ---
    if (closeAsignar) closeAsignar.onclick = () => document.getElementById('asignarModal').classList.remove('is-open');
    if (formAsignar) formAsignar.onsubmit = guardarAsignacion;

    // Cargar Datos
    cargarUsuarios();
    cargarTodasGranjas();

  } else {
    if (accessDenied) accessDenied.style.display = 'block';
    if (adminSection) adminSection.style.display = 'none';
  }
});