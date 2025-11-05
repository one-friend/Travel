// utils/poster.js
import { exportEChartImage } from './canvasExport';
import { drawRoundImg, drawTextBlock } from './drawHelper';

export function createSharePoster(options) {
  console.log('📌 createSharePoster start'); 
  return new Promise(async (resolve, reject) => {
    try {
      const {
        chartComponent,
        userInfo,
        text,
        watermark
      } = options;
      console.log('step1 export chart image...');
      
      // 导出图表的图像
      const chartImage = await exportEChartImage(chartComponent);
      console.log('✅ step1 chart img ok:', chartImage);
      
      // 获取系统信息
      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const width = windowWidth * 2; // 海报宽度
      const height = width * 1.6;  // 海报高度，按16:10比例

      const dpr = wx.getSystemInfoSync().pixelRatio; // 获取设备的像素比
      const ctx = wx.createCanvasContext('posterCanvas');

      // 白色背景
      ctx.setFillStyle('#ffffff');
      ctx.fillRect(0, 0, width, height);

      // 图表绘制区域
      const chartWidth = width - 80;
      const chartHeight = chartWidth; // 图表是正方形
      const chartX = (width - chartWidth) / 2;  // 水平居中
      const chartY = 140; // 图表距离顶部的间距

      // 插入图表
      ctx.drawImage(chartImage, chartX, chartY, chartWidth, chartHeight);

      // 用户头像
      console.log('step2 download avatar');
      const avatarX = 40;
      const avatarY = 40;
      const avatarSize = 100;
      await drawRoundImg(ctx, userInfo.avatar, avatarX, avatarY, avatarSize);
      console.log('✅ step 2 avatar ok:');

      // 用户昵称（位置根据头像动态调整）
      const nicknameX = avatarX + avatarSize + 20;
      const nicknameY = avatarY + 30;
      ctx.setFontSize(40);
      ctx.setFillStyle('#333');
      ctx.fillText(userInfo.nickname, nicknameX, nicknameY);

      // 标题 + 描述
      // 标题
      drawTextBlock(ctx, text.title, 40, 160, width - 80, 50, '#111', 44);
      // 描述
      drawTextBlock(ctx, text.desc, 40, 220, width - 80, 50, '#666', 32);

      // 水印（如果有）
      if (watermark) {
        ctx.setFontSize(30);
        ctx.setFillStyle('rgba(0,0,0,0.15)');
        const watermarkWidth = ctx.measureText(watermark).width;
        ctx.fillText(watermark, width - watermarkWidth - 30, height - 50);
      }

      console.log('✅ 进入canvasToTempFilePath写canvas步骤');
      
      // 最后绘制图像并导出
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'posterCanvas',
          destWidth: width * dpr, // 导出宽度（按设备像素比调整）
          destHeight: height * dpr, // 导出高度
          success(res) {
            console.log('✅ 写完了', res);
            resolve(res.tempFilePath);  // 返回海报路径
          },
          fail(err) {
            reject(err);
          }
        });
      });

    } catch (e) {
      reject(e); // 错误处理
    }
  });
}

