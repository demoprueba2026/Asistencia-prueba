const mostrarReciboPago = (student, year) => {
  const pagos = Object.entries(student.payments || {})
    .filter(([, pago]) => pago.status === 'pago' || pago.status === 'abono')
    .sort(([firstPeriod, firstPago], [secondPeriod, secondPago]) => {
      if (firstPeriod === 'inscripcion') return secondPeriod === 'inscripcion' ? 0 : -1;
      if (secondPeriod === 'inscripcion') return 1;
      return String(firstPago.date || '').localeCompare(String(secondPago.date || ''));
    });
  const cedulaKey = Object.keys(student).find(key => normalizarTexto(key).includes('cedula'));
  const nombrePeriodo = periodo => PERIODOS_PAGO.find(item => item.id === periodo)?.label || periodo;
  document.getElementById('reciboNombre').textContent = student.name;
  document.getElementById('reciboCedula').textContent = canViewStudentPersonalData()
    ? student[cedulaKey] || 'No registrada'
    : 'Oculto';
  document.getElementById('reciboAno').textContent = `${year}° Año`;
  const obtenerMontoPago = (periodo, pago) => parseFloat(pago.amount) || (pago.status === 'pago' ? costoPeriodo(periodo) : 0);
  document.getElementById('reciboPagosBody').innerHTML = pagos.length
    ? pagos.map(([periodo, pago]) => {
      const montoPagado = obtenerMontoPago(periodo, pago);
      const montoAbono = pago.status === 'abono' ? `$${montoPagado.toFixed(2)}` : '-';
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${nombrePeriodo(periodo)}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${pago.date || 'Sin fecha'}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${montoAbono}</td><td class="admin-receipt-amount">$${montoPagado.toFixed(2)}</td></tr>`;
    }).join('')
    : '<tr><td colspan="4" style="padding: 15px; text-align: center;">No hay pagos registrados.</td></tr>';
  document.getElementById('reciboTotal').textContent = pagos.reduce((total, [periodo, pago]) => total + obtenerMontoPago(periodo, pago), 0).toFixed(2);
  document.getElementById('reciboPagoModal').classList.remove('hidden');
};

const cerrarReciboPago = () => document.getElementById('reciboPagoModal').classList.add('hidden');

const ensureHtml2Canvas = () => new Promise((resolve) => {
  if (window.html2canvas) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.head.appendChild(script);
});

const descargarReciboPagoPDF = async () => {
  const btnDescargar = document.getElementById('btnDescargarFactura');
  const contenidoOriginal = btnDescargar ? btnDescargar.innerHTML : '';
  if (btnDescargar) {
    btnDescargar.disabled = true;
    btnDescargar.innerHTML = `
      <svg style="width:16px;height:16px;animation:spin 1s linear infinite;fill:currentColor;" viewBox="0 0 24 24">
        <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 16c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
      </svg>
      Generando PDF...
    `;
  }

  try {
    const ready = await ensureHtml2Canvas();
    if (!ready || !window.html2canvas) {
      showToast('⚠️ No se pudo cargar la librería para generar la factura.');
      return;
    }
    if (!window.jspdf?.jsPDF) {
      showToast('⚠️ No se pudo cargar el generador de PDF.');
      return;
    }

    const receiptPaper = document.querySelector('#reciboPagoModal .admin-receipt-paper');
    if (!receiptPaper) {
      showToast('⚠️ No se encontró la factura para descargar.');
      return;
    }

    const sealImg = receiptPaper.querySelector('.admin-receipt-seal');
    if (sealImg && !sealImg.complete) {
      await sealImg.decode().catch(() => {});
    }

    const studentName = document.getElementById('reciboNombre')?.textContent?.trim() || 'Estudiante';
    const canvas = await window.html2canvas(receiptPaper, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);

    const proportionalHeight = (canvas.height * availableWidth) / canvas.width;
    const scale = Math.min(1, availableHeight / proportionalHeight);
    const finalWidth = availableWidth * scale;
    const finalHeight = proportionalHeight * scale;
    const posX = (pageWidth - finalWidth) / 2;
    const posY = 15;

    doc.addImage(canvas.toDataURL('image/png'), 'PNG', posX, posY, finalWidth, finalHeight);

    const safeName = studentName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '');
    const fechaHoy = new Date().toISOString().slice(0, 10);
    doc.save(`Factura_${safeName}_${fechaHoy}.pdf`);
    showToast('✅ Factura descargada en PDF correctamente');
  } catch (err) {
    console.error('Error generando factura PDF:', err);
    showToast('⚠️ Ocurrió un error al descargar la factura');
  } finally {
    if (btnDescargar) {
      btnDescargar.disabled = false;
      btnDescargar.innerHTML = contenidoOriginal;
    }
  }
};

