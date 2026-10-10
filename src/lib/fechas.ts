export const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const DIAS_LARGOS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function isoDeHoy(): string {
  return aIso(new Date());
}

export function aIso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function desdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, (mes ?? 1) - 1, dia ?? 1);
}

export function diasSiguientes(cantidad: number, desde = new Date()): { iso: string; dia: number; numero: number }[] {
  const resultado: { iso: string; dia: number; numero: number }[] = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(desde);
    fecha.setDate(desde.getDate() + i);
    resultado.push({ iso: aIso(fecha), dia: fecha.getDay(), numero: fecha.getDate() });
  }
  return resultado;
}

export function formatearFechaCorta(iso: string): string {
  const fecha = desdeIso(iso);
  return `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

export function formatearFechaLarga(iso: string): string {
  const fecha = desdeIso(iso);
  const texto = `${DIAS_LARGOS[fecha.getDay()]} ${fecha.getDate()} de ${MESES_CORTOS[fecha.getMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function esHoy(iso: string): boolean {
  return iso === isoDeHoy();
}

export function horaCorta(hora: string): string {
  const [h, m] = hora.split(':');
  const horas = Number(h);
  const sufijo = horas >= 12 ? 'p. m.' : 'a. m.';
  const doce = horas % 12 === 0 ? 12 : horas % 12;
  return `${doce}:${m ?? '00'} ${sufijo}`;
}

export function formatearMoneda(valor: number): string {
  const limpio = Number(valor);
  const texto = Number.isInteger(limpio) ? String(limpio) : limpio.toFixed(2);
  return `$${texto}`;
}

export function formatearNumero(valor: number): string {
  return String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function distanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function textoDistancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toFixed(1)} km`;
  return `${Math.round(metros)} m`;
}
