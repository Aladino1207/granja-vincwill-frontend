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

      // Crear lista visual de granjas
      const granjasNombres = usuario.Granjas && usuario.Granjas.length > 0
        ? usuario.Granjas.map(g => `<span class="badge">${g.nombre}</span>`).join(' ')
        : '<span style="color: #999;">Sin asignar</span>';

      // Guardamos los IDs de sus granjas en un atributo data para usarlos luego
      const granjaIds = usuario.Granjas ? JSON.stringify(usuario.Granjas.map(g => g.id)) : '[]';

      tr.innerHTML = `
        <td>${usuario.name}</td>
        <td>${usuario.email}</td>
        <td>${usuario.role}</td>
        <td>${granjasNombres}</td>
        <td>
          <button onclick="editarUsuario(${usuario.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
          <!-- Botón para abrir el modal de checkboxes -->
          <button onclick='abrirAsignacion(${usuario.id}, "${usuario.name}", ${granjaIds})' class="btn btn-sm btn-primario" style="background-color: #34495e;">🏠 Asignar</button>
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
      renderGranjasTable(); // Función auxiliar para la tabla de abajo
    }
  } catch (error) { console.error(error); }
}

function renderGranjasTable() {
  const tbody = document.getElementById('tablaGranjasBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  allGranjas.forEach(g => {
    tbody.innerHTML += `<tr><td>${g.nombre}</td><td>${g.ubicacion || '-'}</td><td>-</td></tr>`;
  });
}

// --- LÓGICA DEL MODAL DE CHECKBOXES ---

function abrirAsignacion(userId, userName, userGranjasIds) {
  const modal = document.getElementById('asignarModal');
  const container = document.getElementById('granjasCheckboxes');
  document.getElementById('asignarTitle').textContent = `Asignar a: ${userName}`;
  document.getElementById('assignUserId').value = userId;

  container.innerHTML = '';

  if (allGranjas.length === 0) {
    container.innerHTML = '<p>No hay granjas creadas en el sistema.</p>';
  } else {
    allGranjas.forEach(granja => {
      // Verificar si el usuario ya tiene esta granja
      const isChecked = userGranjasIds.includes(granja.id) ? 'checked' : '';

      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.padding = '5px';
      div.style.borderBottom = '1px solid #eee';

      div.innerHTML = `
                <input type="checkbox" id="chk_granja_${granja.id}" value="${granja.id}" ${isChecked} style="width: 20px; height: 20px; margin-right: 10px;">
                <label for="chk_granja_${granja.id}" style="cursor: pointer; width: 100%;">${granja.nombre}</label>
            `;
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

  // Convertir nodos a array de IDs
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
      alert('Permisos actualizados correctamente.');
      cargarUsuarios(); // Refrescar la tabla
    } else {
      alert('Error al asignar granjas');
    }
  } catch (err) { alert('Error de conexión'); }
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

  const url = esEdicion ? `${API_URL}/users/${usuarioId}` : `${API_URL}/users`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(usuario)
    });
    if (res.ok) {
      cerrarFormulario();
      await cargarUsuarios();
    } else {
      const errorData = await res.json();
      alert('Error al guardar usuario: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarUsuario(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el usuario');
    const usuario = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('name').value = usuario.name;
    document.getElementById('email').value = usuario.email;
    document.getElementById('role').value = usuario.role;
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = 'Dejar en blanco para no cambiar';

    abrirFormulario();
    window.scrollTo(0, 0); // Sube al formulario

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

// --- V 3.0: Lógica de Creación de Granjas ---
async function guardarGranja(e) {
  e.preventDefault();

  const granja = {
    nombre: document.getElementById('granjaNombre').value,
    ubicacion: document.getElementById('granjaUbicacion').value
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/granjas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(granja)
    });

    if (res.ok) {
      document.getElementById('granjaForm').reset();
      await cargarTodasGranjas(); // Recargar la lista de granjas
    } else {
      const errorData = await res.json();
      alert('Error al crear granja: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión al crear granja');
  }
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

  // Referencias a elementos del DOM
  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const userForm = document.getElementById('userForm');
  const formContainer = document.getElementById('formContainer');

  const adminSection = document.getElementById('adminSection'); // Contenedor de Granjas
  const userSection = document.getElementById('userSection');   // Contenedor de Usuarios
  const accessDenied = document.getElementById('accessDenied');

  const granjaForm = document.getElementById('granjaForm');
  const asignarModal = document.getElementById('asignarModal');
  const closeAsignar = document.getElementById('closeAsignarModal');
  const formAsignar = document.getElementById('asignarForm');

  // LÓGICA DE PERMISOS (Solo Admin)
  if (currentUser && currentUser.role === 'admin') {

    // 1. Mostrar las secciones de administración
    if (userSection) userSection.style.display = 'block';
    if (adminSection) adminSection.style.display = 'grid'; // 'grid' porque así lo definimos en el CSS/HTML
    if (accessDenied) accessDenied.style.display = 'none';

    // 2. Configurar formulario de Usuarios (Crear/Editar)
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = formContainer.classList.contains('is-open');
        if (isOpen) {
          cerrarFormulario();
        } else {
          userForm.reset();
          document.getElementById('usuarioId').value = '';
          document.getElementById('formTitle').textContent = 'Crear Nuevo Usuario';
          document.getElementById('password').placeholder = 'Contraseña (requerida)';
          abrirFormulario();
        }
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (userForm) userForm.onsubmit = guardarUsuario;

    // 3. Configurar formulario de Granjas (Crear Granja)
    if (granjaForm) granjaForm.onsubmit = guardarGranja;

    // 4. Configurar Modal de Asignación de Granjas
    if (closeAsignar) closeAsignar.onclick = () => asignarModal.classList.remove('is-open');
    if (formAsignar) formAsignar.onsubmit = guardarAsignacion;

    // 5. Cargar Datos Iniciales
    cargarUsuarios();
    cargarTodasGranjas(); // Importante para poder asignar después

  } else {
    // SI NO ES ADMIN: Ocultar todo y mostrar error
    if (accessDenied) accessDenied.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
  }
});