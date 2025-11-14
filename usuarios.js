let allGranjas = []; // Guardar lista de granjas

// --- Lógica de Carga (Global, NO se filtra por granjaId) ---
async function cargarUsuarios() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const usuarios = await res.json();
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    usuarios.forEach(usuario => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${usuario.name}</td>
        <td>${usuario.email}</td>
        <td>${usuario.role}</td>
        <td>
          <button onclick="editarUsuario(${usuario.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
          <button onclick="asignarGranjas(${usuario.id}, '${usuario.name}')" class="btn btn-sm btn-primario">Asignar Granjas</button>
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
    const res = await fetch(`${API_URL}/granjas/todas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al cargar granjas');
    allGranjas = await res.json();

    // Poblar la tabla de granjas
    const tbody = document.getElementById('tablaGranjasBody');
    tbody.innerHTML = '';
    if (allGranjas.length > 0) {
      allGranjas.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td>${g.nombre}</td>
                <td>${g.ubicacion || 'N/A'}</td>
                <td><button class="btn btn-sm btn-peligro" disabled>Borrar</button></td>
            `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="3">No hay granjas creadas.</td></tr>';
    }

  } catch (error) {
    console.error('Error al cargar lista de granjas:', error);
  }
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

// --- Event Listener Principal (MODIFICADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  document.querySelector('header h1').textContent = `Gestión Global (Admin)`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const userForm = document.getElementById('userForm');
  const formContainer = document.getElementById('formContainer');
  const granjaForm = document.getElementById('granjaForm');

  // Lógica de permisos
  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('adminSection').style.display = 'grid'; // Mostrar todo el admin

    // --- Lógica de formulario de usuarios ---
    toggleBtn.style.display = 'block';
    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        userForm.reset();
        document.getElementById('usuarioId').value = '';
        formTitle.textContent = 'Crear Nuevo Usuario';
        document.getElementById('password').placeholder = 'Contraseña (requerida)';
        abrirFormulario();
      }
    });
    cancelBtn.addEventListener('click', cerrarFormulario);
    userForm.onsubmit = guardarUsuario;

    // --- Lógica de formulario de granjas ---
    granjaForm.onsubmit = guardarGranja;

    // Cargar datos
    cargarUsuarios();
    cargarTodasGranjas(); // Carga la lista para las asignaciones

  } else {
    // Oculta todo si no es admin
    document.getElementById('accessDenied').style.display = 'block';
    document.getElementById('adminSection').style.display = 'none';
  }
});