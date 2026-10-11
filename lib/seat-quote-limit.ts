export function seatQuantityForQuote(value:string,minimum:number,maximum?:number) {
 if(!maximum || maximum<minimum) throw new Error('The seat limit has not been confirmed. Refresh your quote before changing seats.');
 const quantity=Number(value);
 return Math.max(minimum,Math.min(maximum,Number.isFinite(quantity)?Math.floor(quantity):minimum));
}
