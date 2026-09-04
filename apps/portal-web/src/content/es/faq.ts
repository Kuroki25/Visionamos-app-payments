/**
 * FAQ content (`03-public-home-faq.png`). Static copy, not backend data
 * (master prompt §20/§93) — but the answers themselves are grounded in what
 * `docs/payments/PAYMENT_FLOW_MODEL.md` actually confirms today, not
 * invented capabilities. In particular §17 of that document ("Consulta
 * posterior sin cuenta") is explicitly an open decision — the answer below
 * describes only what's real (the transaction's own state, shown in-portal
 * right after paying), never a promised email/SMS confirmation the backend
 * doesn't send yet.
 */
export const faq = {
  title: 'Preguntas',
  titleAccent: 'frecuentes..',
  items: [
    {
      question: '¿Cuál es el procedimiento para realizar el pago?',
      answer:
        'Busca tu portal o tu comercio aliado, selecciona el servicio que deseas pagar, completa el formulario con tus datos y confirma el pago a través de PSE.',
    },
    {
      question: '¿Obtendré una confirmación de los pagos efectuados?',
      answer:
        'Al finalizar el pago verás de inmediato el estado de tu transacción — referencia, monto, fecha y resultado — directamente en el portal.',
    },
    {
      question: '¿Cualquier comercio se podrá habilitar en los subportales?',
      answer:
        'No. Solo los comercios aliados que el administrador de cada portal publica y mantiene activos aparecen disponibles para recibir pagos.',
    },
  ],
} as const;
