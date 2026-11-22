// Prezzi in formato italiano, come nella tela: «4.200 €», «1.450,50 €» (ritocchi del ticket 08).
// Scritto a mano perché `toLocaleString('it-IT')` non raggruppa le migliaia sotto 10.000 («4200»).
export function formatPrice(value: number): string {
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped}${dec === '00' ? '' : `,${dec}`} €`;
}
