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

    // 1. Obtener datos
    const resVenta = await fetch(`${window.API_URL}/ventas/${ventaId}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resVenta.ok) throw new Error("No se pudo cargar la venta");
    const venta = await resVenta.json();

    // Configuración y Cliente
    let config = JSON.parse(localStorage.getItem('granjaConfig'));
    if (!config) {
      const resConfig = await fetch(`${window.API_URL}/config?granjaId=${granjaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      config = await resConfig.json();
    }

    const resCliente = await fetch(`${window.API_URL}/clientes/${venta.clienteId}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await resCliente.json();

    // Datos de la granja (para ubicación)
    const granjaInfo = JSON.parse(localStorage.getItem('selectedGranja'));

    // --- INICIO DISEÑO PDF ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- COLORES Y FUENTES ---
    const azulOscuro = [44, 62, 80];
    const rojoSRI = [192, 57, 43];
    const grisClaro = [245, 245, 245];

    // --- CABECERA IZQUIERDA (EMISOR) ---
    // Logo (si existe URL en config, aquí iría la lógica para convertir a base64, por ahora texto)
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...azulOscuro);
    doc.text(config.nombreGranja || "GRANJA AVÍCOLA VINCWILL", 14, 25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text("Matriz:", 14, 35);
    doc.text(granjaInfo.ubicacion || "Sin dirección registrada", 30, 35);
    doc.text("Teléfono:", 14, 40);
    doc.text("0999999999", 30, 40); // Placeholder o dato real si lo tienes
    doc.text("Obligado a llevar contabilidad: NO", 14, 45);

    // --- CABECERA DERECHA (EL "CUADRO DEL RUC") ---
    // Dibujamos el rectángulo redondeado clásico
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.roundedRect(110, 15, 90, 35, 3, 3); // x, y, w, h, rx, ry

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("R.U.C.: 1300000000001", 115, 23); // Dato quemado o desde config

    doc.setFillColor(...rojoSRI);
    doc.rect(110, 28, 90, 8, 'F'); // Barra roja de título
    doc.setTextColor(255, 255, 255);
    doc.text("F A C T U R A", 155, 34, { align: "center" });

    doc.setTextColor(0);
    doc.setFontSize(10);
    // Formato tradicional 001-001-xxxxxxxxx
    const numFactura = venta.id.toString().padStart(9, '0');
    doc.text(`No. 001-001-${numFactura}`, 115, 43);

    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("AUTORIZACIÓN SRI: 1111222233", 115, 48); // Placeholder

    // --- DATOS DEL CLIENTE (BANDA GRIS) ---
    doc.setFillColor(230, 230, 230);
    doc.rect(14, 60, 186, 22, 'F'); // Fondo gris suave

    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");

    // Fila 1
    doc.text("Razón Social / Nombres:", 16, 66);
    doc.setFont("helvetica", "normal");
    doc.text(cliente.nombre, 60, 66);

    doc.setFont("helvetica", "bold");
    doc.text("Identificación:", 140, 66);
    doc.setFont("helvetica", "normal");
    doc.text(cliente.identificacion, 165, 66);

    // Fila 2
    doc.setFont("helvetica", "bold");
    doc.text("Fecha Emisión:", 16, 73);
    doc.setFont("helvetica", "normal");
    // Formato fecha Ecuador (DD/MM/AAAA)
    const fechaObj = new Date(venta.fecha);
    const fechaEcuador = `${fechaObj.getUTCDate().toString().padStart(2, '0')}/${(fechaObj.getUTCMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getUTCFullYear()}`;
    doc.text(fechaEcuador, 60, 73);

    doc.setFont("helvetica", "bold");
    doc.text("Guía Remisión:", 140, 73);
    doc.setFont("helvetica", "normal");
    doc.text("-", 165, 73);

    // Fila 3
    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", 16, 80);
    doc.setFont("helvetica", "normal");
    doc.text(cliente.direccion || "S/N", 60, 80);

    // --- TABLA DE DETALLES ---
    const totalVenta = (venta.peso * venta.precio);

    const tableBody = [
      [
        venta.cantidadVendida, // Cantidad
        `Pollos en pie - Lote ${venta.Lote ? venta.Lote.loteId : venta.loteId} (${venta.peso.toFixed(2)} kg)`, // Descripción detallada
        `$${venta.precio.toFixed(2)}`, // Precio Unitario
        `$${totalVenta.toFixed(2)}` // Total
      ]
    ];

    doc.autoTable({
      startY: 90,
      head: [['Cant.', 'Descripción', 'V. Unitario', 'V. Total']],
      body: tableBody,
      theme: 'plain', // Tema plano para personalizar bordes
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      headStyles: {
        fillColor: azulOscuro,
        textColor: 255,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', width: 20 },
        2: { halign: 'right', width: 30 },
        3: { halign: 'right', width: 30 }
      }
    });

    // --- PIE DE PÁGINA Y TOTALES ---
    let finalY = doc.lastAutoTable.finalY + 5;

    // Sección Izquierda (Info Adicional)
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Información Adicional:", 14, finalY + 5);

    doc.rect(14, finalY + 7, 100, 25); // Caja info
    doc.text(`Email: ${cliente.email || 'No registrado'}`, 16, finalY + 13);
    doc.text(`Teléfono: ${cliente.telefono || 'No registrado'}`, 16, finalY + 18);
    doc.text("Forma de Pago: Efectivo / Transferencia", 16, finalY + 23);

    // Sección Derecha (Totales - Estilo Ecuador)
    const xTotales = 130;
    const wTotales = 66;
    const hLine = 6;

    // Función auxiliar para dibujar filas de totales
    const drawTotalRow = (label, value, y, isBold = false) => {
      doc.setDrawColor(200);
      doc.rect(xTotales, y, wTotales, hLine); // Caja
      doc.rect(xTotales, y, wTotales / 2, hLine); // Línea vertical media

      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(label, xTotales + 2, y + 4);
      doc.text(value, xTotales + wTotales - 2, y + 4, { align: "right" });
    };

    // NOTA: Pollos en pie suelen ser tarifa 0% IVA. Ajusta si es diferente.
    drawTotalRow("SUBTOTAL 12%", "$ 0.00", finalY);
    drawTotalRow("SUBTOTAL 0%", `$ ${totalVenta.toFixed(2)}`, finalY + hLine);
    drawTotalRow("DESCUENTO", "$ 0.00", finalY + (hLine * 2));
    drawTotalRow("IVA 12%", "$ 0.00", finalY + (hLine * 3));
    drawTotalRow("VALOR TOTAL", `$ ${totalVenta.toFixed(2)}`, finalY + (hLine * 4), true);

    // Mensaje final
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Documento sin validez tributaria (Generado por Sistema VincWill)", 105, 285, { align: 'center' });

    // Guardar PDF
    doc.save(`Factura_${venta.id}_${cliente.identificacion}.pdf`);

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