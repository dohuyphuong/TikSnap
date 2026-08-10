export const drawLine = (ctx: any, startX: number, startY: number, endX: number, endY: number, strokeColor: string, strokeWidth: number) => {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();
};

export const drawRectangle = (ctx: any, x: number, y: number, width: number, height: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
};
