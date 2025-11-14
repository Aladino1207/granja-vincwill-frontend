// --- Lógica de Carga (Global, solo Admin) ---
async function cargarProveedores() {
    try {
        const token = localStorage.getItem('token');
        // Este endpoint es global, no necesita granjaId
        const res = await fetch(`${window.API_URL}/proveedores`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const proveedores = await res.json();
        const tbody = document.getElementById('tablaProveedoresBody');
        tbody.innerHTML = '';

        if (proveedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hay proveedores registrados.</td></tr>';
            return;
        }

        proveedores.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${p.nombreCompania}</td>
        <td>${p.ruc}</td>
        <td>${p.nombreRepresentante || 'N/A'}</td>
        <td>${p.emailRepresentante || 'N/A'}</td>
        <td>
          <button onclick="editarProveedor(${p.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
          <button onclick="eliminarProveedor(${p.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error al cargar proveedores:', error);
    }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---
function abrirFormulario() {
    document.getElementById('formContainer').classList.add('is-open');
    document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
    document.getElementById('formContainer').classList.remove('is-open');
    document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Proveedor';
    document.getElementById('proveedorForm').reset();
    document.getElementById('proveedorId').value = '';
    document.getElementById('formTitle').textContent = 'Registrar Nuevo Proveedor';
}

// --- Funciones CRUD (Globales, solo Admin) ---

async function guardarProveedor(e) {
    e.preventDefault();

    const proveedorId = document.getElementById('proveedorId').value;
    const esEdicion = !!proveedorId;

    const proveedor = {
        nombreCompania: document.getElementById('nombreCompania').value,
        ruc: document.getElementById('ruc').value,
        nombreRepresentante: document.getElementById('nombreRepresentante').value,
        emailRepresentante: document.getElementById('emailRepresentante').value,
        telefono: document.getElementById('telefono').value,
        tipoServicio: document.getElementById('tipoServicio').value,
        direccion: document.getElementById('direccion').value
    };

    const url = esEdicion
        ? `${window.API_URL}/proveedores/${proveedorId}` // PUT
        : `${window.API_URL}/proveedores`; // POST
    const method = esEdicion ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(proveedor)
        });

        if (res.ok) {
            cerrarFormulario();
            await cargarProveedores();
        } else {
            const errorData = await res.json();
            alert('Error al guardar proveedor: ' + (errorData.error || 'Desconocido'));
        }
    } catch (error) {
        alert('Error de conexión');
    }
}

async function editarProveedor(id) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${window.API_URL}/proveedores/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo cargar el proveedor');
        const p = await res.json();

        document.getElementById('formTitle').textContent = 'Editar Proveedor';
        document.getElementById('proveedorId').value = p.id;
        document.getElementById('nombreCompania').value = p.nombreCompania;
        document.getElementById('ruc').value = p.ruc;
        document.getElementById('nombreRepresentante').value = p.nombreRepresentante;
        document.getElementById('emailRepresentante').value = p.emailRepresentante;
        document.getElementById('telefono').value = p.telefono;
        document.getElementById('tipoServicio').value = p.tipoServicio;
        document.getElementById('direccion').value = p.direccion;

        abrirFormulario();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error('Error al cargar datos para editar:', error);
        alert('Error al cargar datos del proveedor.');
    }
}

async function eliminarProveedor(id) {
    if (confirm('¿Seguro que quieres eliminar este proveedor?')) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${window.API_URL}/proveedores/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            cargarProveedores();
        } catch (error) {
            alert('Error al eliminar proveedor.');
        }
    }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // V 3.1: Este módulo es solo para Admins
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('adminContent').style.display = 'grid';

        const toggleBtn = document.getElementById('toggleFormBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('proveedorForm');
        const formContainer = document.getElementById('formContainer');

        toggleBtn.style.display = 'block';
        toggleBtn.addEventListener('click', () => {
            const isOpen = formContainer.classList.contains('is-open');
            if (isOpen) {
                cerrarFormulario();
            } else {
                document.getElementById('formTitle').textContent = 'Registrar Nuevo Proveedor';
                form.reset();
                document.getElementById('proveedorId').value = '';
                abrirFormulario();
            }
        });

        cancelBtn.addEventListener('click', cerrarFormulario);
        form.onsubmit = guardarProveedor;

        cargarProveedores(); // Carga todos los proveedores
    } else {
        // Si no es admin, oculta todo y muestra el error
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
    }

    // Poner el título (es global)
    document.querySelector('header h1').textContent = `Proveedores (Global)`;
});