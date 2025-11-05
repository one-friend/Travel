// utils/drawHelper.js
export function drawRoundImg(ctx, imgUrl, x, y, size) {
  return new Promise(resolve => {
    if(!imgUrl) resolve()
    wx.getImageInfo({
      src: imgUrl,
      success(res) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(res.path, x, y, size, size);
        ctx.restore();
        resolve();
      }
    });
  });
}

export function drawTextBlock(ctx, text, x, y, maxWidth, lineHeight, color, fontSize) {
  ctx.setFontSize(fontSize);
  ctx.setFillStyle(color);

  const chars = text.split('');
  let line = '';
  let offsetY = 0;

  chars.forEach(char => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x, y + offsetY);
      line = char;
      offsetY += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line, x, y + offsetY);
}
