let listaClientes = [];

// --- Lógica de Carga ---

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    lotes.filter(lote => lote.estado === 'disponible').forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      option.dataset.cantidad = lote.cantidad;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarClientes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/clientes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      listaClientes = await res.json();
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error);
  }
}

async function cargarVentas() {
  console.log("Iniciando carga de ventas...");
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/ventas?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');
        const nombreLote = (venta.Lote && venta.Lote.loteId) ? venta.Lote.loteId : 'N/A';
        const nombreCliente = (venta.Cliente && venta.Cliente.nombre) ? venta.Cliente.nombre : 'N/A';
        const total = (venta.peso * venta.precio).toFixed(2);

        // Formato fecha amigable
        const fechaVisual = new Date(venta.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' });

        tr.innerHTML = `
          <td>${nombreLote}</td>
          <td>${nombreCliente}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>$${venta.precio.toFixed(2)}</td>
          <td><strong>$${total}</strong></td>
          <td>${fechaVisual}</td>
          <td>
            <div style="display: flex; gap: 5px;">
                <button onclick="imprimirFactura(${venta.id})" class="btn btn-sm btn-primario" title="Imprimir Factura">🖨️</button>
                
                <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro" title="Revertir Venta">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay ventas registradas.</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}

// --- Función Generadora de PDF ---
async function imprimirFactura(ventaId) {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();

    // 1. Obtener datos de la venta específica (Back end ya soporta GET /ventas/:id)
    const resVenta = await fetch(`${window.API_URL}/ventas/${ventaId}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resVenta.ok) throw new Error("No se pudo cargar la venta");
    const venta = await resVenta.json();

    // 2. Obtener datos de configuración (para nombre de granja y logo)
    // Intentamos obtener de cache primero, si no del server
    let config = JSON.parse(localStorage.getItem('granjaConfig'));
    if (!config) {
      const resConfig = await fetch(`${window.API_URL}/config?granjaId=${granjaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      config = await resConfig.json();
    }

    // 3. Obtener datos del cliente completo (porque la venta a veces solo trae el ID o nombre basico)
    const resCliente = await fetch(`${window.API_URL}/clientes/${venta.clienteId}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await resCliente.json();

    // --- GENERACIÓN DEL PDF ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Colores y Estilos
    const colorPrimario = [44, 62, 80]; // Un azul oscuro profesional
    const margen = 14;
    let cursorY = 20;

    // A. ENCABEZADO
    doc.setFontSize(22);
    doc.setTextColor(...colorPrimario);
    doc.text(config.nombreGranja || "Granja Avícola", margen, cursorY);

    doc.setFontSize(10);
    doc.setTextColor(100);
    // Si tienes dirección en config, úsala, si no, usa la ubicación de la granja
    const ubicacion = JSON.parse(localStorage.getItem('selectedGranja'))?.ubicacion || "Ubicación General";
    doc.text(`Dirección: ${ubicacion}`, margen, cursorY + 6);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, margen, cursorY + 11);

    // Bloque derecho (Factura ID)
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`FACTURA #${venta.id.toString().padStart(6, '0')}`, 190, cursorY, { align: 'right' });

    cursorY += 25;

    // B. INFORMACIÓN DEL CLIENTE
    doc.setDrawColor(200);
    doc.line(margen, cursorY, 196, cursorY); // Línea separadora
    cursorY += 10;

    doc.setFontSize(12);
    doc.setTextColor(...colorPrimario);
    doc.text("Información del Cliente", margen, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Cliente: ${cliente.nombre}`, margen, cursorY);
    doc.text(`Identificación (${cliente.tipoIdentificacion}): ${cliente.identificacion}`, margen, cursorY + 5);
    doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, margen, cursorY + 10);
    doc.text(`Dirección: ${cliente.direccion || 'N/A'}`, margen, cursorY + 15);

    cursorY += 25;

    // C. TABLA DE DETALLES (Usando autotable)
    const totalVenta = (venta.peso * venta.precio);

    // En tu modelo, una venta es de un solo lote, así que es una sola fila
    // Si quisieras formato tabla real:
    const tableBody = [
      [
        `Pollos de Engorde - Lote ${venta.Lote ? venta.Lote.loteId : venta.loteId}`, // Descripción
        venta.cantidadVendida, // Cantidad
        `${venta.peso.toFixed(2)} kg`, // Peso
        `$${venta.precio.toFixed(2)}`, // Precio Unitario
        `$${totalVenta.toFixed(2)}` // Total
      ]
    ];

    doc.autoTable({
      startY: cursorY,
      head: [['Descripción', 'Cant. Aves', 'Peso Total', 'Precio/Kg', 'Subtotal']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: colorPrimario },
      styles: { fontSize: 10, halign: 'center' },
      columnStyles: {
        0: { halign: 'left' }, // Descripción a la izquierda
        4: { fontStyle: 'bold', halign: 'right' } // Total a la derecha
      }
    });

    // D. TOTALES
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.text("Total a Pagar:", 140, finalY);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`$${totalVenta.toFixed(2)}`, 190, finalY, { align: 'right' });

    // E. PIE DE PÁGINA
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("Gracias por su compra.", 105, 280, { align: 'center' });
    doc.text("Generado por Sistema VincWill", 105, 285, { align: 'center' });

    // Guardar PDF
    doc.save(`Factura_VincWill_${venta.id}.pdf`);

  } catch (error) {
    console.error(error);
    alert("Error al generar la factura. Verifica la consola.");
  }
}

// --- CALCULADORA EN TIEMPO REAL ---
function calcularTotalVenta() {
  const peso = parseFloat(document.getElementById('peso').value) || 0;
  const precio = parseFloat(document.getElementById('precio').value) || 0;
  const unidad = document.getElementById('unidadPeso').value;

  const lbl = document.getElementById('lblPrecioUnidad');
  if (lbl) lbl.textContent = `/${unidad}`;

  const total = peso * precio;
  const display = document.getElementById('displayTotalVenta');
  if (display) display.textContent = `$${total.toFixed(2)}`;
}

// --- UI Logic ---
function abrirFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';
}
function cerrarFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Registrar Nueva Venta';

  document.getElementById('ventaForm').reset();
  document.getElementById('ventaId').value = '';
  document.getElementById('clienteId').value = '';
  const searchInput = document.getElementById('clienteSearch');
  if (searchInput) searchInput.value = '';

  const display = document.getElementById('displayTotalVenta');
  if (display) display.textContent = '$0.00';

  document.getElementById('formTitle').textContent = 'Registrar Venta';
}

// --- CRUD ---
async function guardarVenta(e) {
  e.preventDefault();

  const ventaId = document.getElementById('ventaId').value;
  if (ventaId) { alert('Edición no soportada.'); return; }

  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const loteId = document.getElementById('loteSelect').value;
  const clienteId = document.getElementById('clienteId').value;

  if (!loteId || !clienteId) { alert('Selecciona Lote y Cliente.'); return; }

  let peso = parseFloat(document.getElementById('peso').value);
  let precio = parseFloat(document.getElementById('precio').value);
  const unidad = document.getElementById('unidadPeso').value;

  // Conversión a KG si es Libras
  if (unidad === 'lb') {
    peso = peso / 2.20462; // Peso a kg
    precio = precio * 2.20462; // Precio a $/kg (para mantener el total $)
  }

  const venta = {
    loteId: parseInt(loteId),
    clienteId: parseInt(clienteId),
    cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
    peso: peso,
    precio: precio,
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(venta)
    });

    if (!res.ok) {
      const errorText = await res.json();
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
      return;
    }

    cerrarFormulario();
    await cargarVentas();
    await cargarLotesForSelect();

  } catch (error) { alert('Error de conexión'); }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres REVERTIR esta venta?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();

      const res = await fetch(`${window.API_URL}/ventas/${id}?granjaId=${granjaId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await cargarVentas();
        await cargarLotesForSelect();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Desconocido'));
      }
    } catch (error) { console.error(error); }
  }
}

// --- Buscadores y Modales (Clientes) ---
function setupClienteSearch() {
  const searchInput = document.getElementById('clienteSearch');
  const resultsContainer = document.getElementById('clienteResults');
  const dropdown = document.getElementById('clienteDropdown');
  const hiddenInput = document.getElementById('clienteId');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    hiddenInput.value = '';
    if (query.length < 1) { resultsContainer.innerHTML = ''; dropdown.classList.remove('is-open'); return; }

    const filtrados = listaClientes.filter(c => c.nombre.toLowerCase().includes(query) || c.identificacion.includes(query));
    resultsContainer.innerHTML = '';
    if (filtrados.length > 0) {
      filtrados.forEach(c => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<strong>${c.nombre}</strong> <span>(${c.identificacion})</span>`;
        item.onclick = () => { searchInput.value = c.nombre; hiddenInput.value = c.id; dropdown.classList.remove('is-open'); };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else dropdown.classList.remove('is-open');
  });
  document.addEventListener('click', (e) => { if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove('is-open'); });
}

function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const openBtn = document.getElementById('openQuickAddCliente');
  const closeBtn = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');

  if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('is-open'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const granjaId = getSelectedGranjaId();
      const nuevoCliente = {
        nombre: document.getElementById('quick_nombre').value,
        tipoIdentificacion: document.getElementById('quick_tipoIdentificacion').value,
        identificacion: document.getElementById('quick_identificacion').value,
        granjaId: granjaId
      };
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${window.API_URL}/clientes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(nuevoCliente)
        });
        if (res.ok) {
          const creado = await res.json();
          modal.classList.remove('is-open');
          form.reset();
          await cargarClientes();
          document.getElementById('clienteSearch').value = creado.nombre;
          document.getElementById('clienteId').value = creado.id;
        } else alert('Error al crear cliente');
      } catch (e) { console.error(e); }
    };
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Ventas (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');

  // Calculadora en tiempo real
  const inputsCalculo = document.querySelectorAll('.input-calculo');
  inputsCalculo.forEach(input => {
    input.addEventListener('input', calcularTotalVenta);
    input.addEventListener('change', calcularTotalVenta);
  });

  // Lógica de cantidad máxima (Stock)
  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cantidadInput = document.getElementById('cantidadVendida');
      if (selectedOption && selectedOption.dataset.cantidad) {
        cantidadInput.placeholder = `Máx: ${selectedOption.dataset.cantidad}`;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else {
          form.reset();
          document.getElementById('ventaId').value = '';
          document.getElementById('clienteId').value = '';
          document.getElementById('formTitle').textContent = 'Registrar Venta';
          abrirFormulario();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarVenta;

    setupClienteSearch();
    setupQuickAddModal();

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarClientes();
  cargarVentas();
});