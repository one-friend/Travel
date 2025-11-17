// cloudfunctions/createMap/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { mapId, cities } = event;

  try {
    // 创建新的足迹记录
    await db.collection('visitedCities').add({
      data: {
        mapId: mapId,
        cities: cities || {}  // 默认空对象
      }
    });

    return {
      success: true,
      message: '足迹创建成功'
    };
  } catch (err) {
    console.error('创建足迹失败', err);
    return {
      success: false,
      message: err.message
    };
  }
};
