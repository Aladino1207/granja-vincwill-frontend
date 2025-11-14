// --- Lógica de Carga (BLINDADA) ---
async function cargarClientes() {
    try {
        const token = localStorage.getItem('token');
        // V 3.0: Obtenemos la granja activa
        const granjaId = getSelectedGranjaId();
        if (!granjaId) return; // Si no hay granja, no hacemos nada

        // V 3.0: Añadimos granjaId al fetch
        const res = await fetch(`${window.API_URL}/clientes?granjaId=${granjaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const clientes = await res.json();
        const tbody = document.getElementById('tablaClientesBody');
        tbody.innerHTML = '';

        if (clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hay clientes registrados en esta granja.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${cliente.nombre}</td>
        <td>${cliente.tipoIdentificacion}: ${cliente.identificacion}</td>
        <td>${cliente.telefono || 'N/A'}</td>
        <td>${cliente.email || 'N/A'}</td>
        <td>
          <button onclick="editarCliente(${cliente.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
          <button onclick="eliminarCliente(${cliente.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---
function abrirFormulario() {
    document.getElementById('formContainer').classList.add('is-open');
    document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
    document.getElementById('formContainer').classList.remove('is-open');
    document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Cliente';
    document.getElementById('clienteForm').reset();
    document.getElementById('clienteId').value = '';
    document.getElementById('formTitle').textContent = 'Registrar Nuevo Cliente';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarCliente(e) {
    e.preventDefault();

    const clienteId = document.getElementById('clienteId').value;
    const esEdicion = !!clienteId;

    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const cliente = {
        nombre: document.getElementById('nombre').value,
        tipoIdentificacion: document.getElementById('tipoIdentificacion').value,
        identificacion: document.getElementById('identificacion').value,
        telefono: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        direccion: document.getElementById('direccion').value,
        granjaId: granjaId // V 3.0: Añadimos granjaId al body
    };

    const url = esEdicion
        ? `${window.API_URL}/clientes/${clienteId}` // PUT
        : `${window.API_URL}/clientes`; // POST
    const method = esEdicion ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(cliente)
        });

        if (res.ok) {
            cerrarFormulario();
            await cargarClientes();
        } else {
            const errorData = await res.json();
            alert('Error al guardar cliente: ' + (errorData.error || 'Desconocido'));
        }
    } catch (error) {
        alert('Error de conexión');
    }
}

async function editarCliente(id) {
    try {
        const token = localStorage.getItem('token');
        // V 3.0: Obtenemos la granja activa
        const granjaId = getSelectedGranjaId();
        if (!granjaId) return;

        // V 3.0: Añadimos granjaId al fetch
        const res = await fetch(`${window.API_URL}/clientes/${id}?granjaId=${granjaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo cargar el cliente');
        const cliente = await res.json();

        document.getElementById('formTitle').textContent = 'Editar Cliente';
        document.getElementById('clienteId').value = cliente.id;
        document.getElementById('nombre').value = cliente.nombre;
        document.getElementById('tipoIdentificacion').value = cliente.tipoIdentificacion;
        document.getElementById('identificacion').value = cliente.identificacion;
        document.getElementById('telefono').value = cliente.telefono;
        document.getElementById('email').value = cliente.email;
        document.getElementById('direccion').value = cliente.direccion;

        abrirFormulario();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error('Error al cargar datos para editar:', error);
        alert('Error al cargar datos del cliente.');
    }
}

async function eliminarCliente(id) {
    if (confirm('¿Seguro que quieres eliminar este cliente? Esto podría fallar si el cliente ya tiene ventas asociadas.')) {
        try {
            const token = localStorage.getItem('token');
            // V 3.0: Obtenemos la granja activa
            const granjaId = getSelectedGranjaId();
            if (!granjaId) return;

            // V 3.0: Añadimos granjaId al fetch
            await fetch(`${window.API_URL}/clientes/${id}?granjaId=${granjaId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            cargarClientes();
        } catch (error) {
            alert('Error al eliminar cliente. Asegúrate de que no tenga ventas registradas.');
        }
    }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));

    // V 3.0: Poner el nombre de la granja en el título
    if (granja) {
        document.querySelector('header h1').textContent = `Clientes (${granja.nombre})`;
    }

    const toggleBtn = document.getElementById('toggleFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('clienteForm');
    const formContainer = document.getElementById('formContainer');

    if (currentUser && currentUser.role !== 'viewer') {
        toggleBtn.style.display = 'block';

        toggleBtn.addEventListener('click', () => {
            const isOpen = formContainer.classList.contains('is-open');
            if (isOpen) {
                cerrarFormulario();
            } else {
                document.getElementById('formTitle').textContent = 'Registrar Nuevo Cliente';
                form.reset();
                document.getElementById('clienteId').value = '';
                abrirFormulario();
            }
        });

        cancelBtn.addEventListener('click', cerrarFormulario);
        form.onsubmit = guardarCliente;

    } else {
        toggleBtn.style.display = 'none';
    }

    cargarClientes(); // Carga solo los clientes de la granja activa
});