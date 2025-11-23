const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const visitedCitiesCollection = db.collection('visitedCities');

/**
 * 地图服务云函数
 * @param {string} event.action - 执行的操作 ('ensureMapData', 'createMap', 'updateDescription')
 * @param {string} event.mapId - 足迹 ID
 * @param {string} [event.description] - 仅用于 updateDescription
 * @returns {object} 操作结果
 */
exports.main = async (event, context) => {
  const { action, mapId, description } = event;

  if (!mapId) {
    return { success: false, errMsg: 'mapId is required' };
  }

  try {
    switch (action) {
      // 1. 确保地图数据存在并有默认文案
      case 'ensureMapData': {
        const res = await visitedCitiesCollection.where({ mapId }).get();
        if (res.data.length === 0) {
          // 如果数据不存在，则新增记录
          await visitedCitiesCollection.add({
            data: {
              mapId: mapId,
              cities: {},
              description: '这是我的新足迹，欢迎点亮更多城市！' // 默认初始化文案
            }
          });
          return { success: true, message: 'Map data initialized.' };
        }
        return { success: true, message: 'Map data already exists.' };
      }

      // 2. 创建新的地图数据
      case 'createMap': {
        await visitedCitiesCollection.add({
          data: {
            mapId: mapId,
            cities: {},
            description: '这是我的新足迹，欢迎点亮更多城市！'
          }
        });
        return { success: true, message: 'New map data created.' };
      }

      // 3. 更新说明文案
      case 'updateDescription': {
        if (!description) {
          return { success: false, errMsg: 'Description content is required for update.' };
        }
        
        // 查找并更新 mapId 对应的记录
        const updateRes = await visitedCitiesCollection.where({ mapId }).update({
          data: {
            description: description
          }
        });

        // updateRes.stats.updated 为 0 时表示未找到记录，返回失败信息
        if (updateRes.stats.updated === 0) {
             return { success: false, errMsg: 'No matching record found to update. (Data initialization needed)' };
        }
        
        return { success: true, message: 'Description updated successfully.', stats: updateRes.stats };
      }

      default:
        return { success: false, errMsg: `Unknown action: ${action}` };
    }
  } catch (e) {
    console.error(`[MapService Error] Action: ${action}`, e);
    return { success: false, errMsg: e.message || `Cloud function error for action: ${action}` };
  }
};