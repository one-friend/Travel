// cloudfunctions/mapService/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const visitedCitiesCollection = db.collection('visitedCities');

exports.main = async (event, context) => {
  const { action, mapId, description } = event;
  const wxContext = cloud.getWXContext(); 

  if (!mapId) {
    return { success: false, errMsg: 'mapId is required' };
  }

  // 封装新增逻辑，实现内部复用并确保关联用户 OPENID
  const createNewMapData = async (mid, initialDescription) => {
    await visitedCitiesCollection.add({
      data: {
        mapId: mid,
        cities: {},
        description: initialDescription || '这是我的新足迹，欢迎点亮更多城市！', 
        _openid: wxContext.OPENID,
        createTime: db.serverDate()
      }
    });
  };

  try {
    switch (action) {
      
      // 1. 确保地图数据存在并有默认文案 (用户专属)
      case 'ensureMapData': {
        const res = await visitedCitiesCollection.where({
          mapId,
          _openid: wxContext.OPENID
        }).get();
        
        if (res.data.length === 0) {
          await createNewMapData(mapId, '这是我的新足迹，欢迎点亮更多城市！');
          return { success: true, message: 'Map data initialized for user.' };
        }
        return { success: true, message: 'Map data already exists for user.' };
      }

      // 2. 创建新的地图数据 (用户专属)
      case 'createMap': {
        await createNewMapData(mapId, '这是我的新足迹，欢迎点亮更多城市！');
        return { success: true, message: 'New map data created for user.' };
      }

      // 3. 更新说明文案 (用户专属)
      case 'updateDescription': {
        if (!description) {
          return { success: false, errMsg: 'Description content is required for update.' };
        }
        
        const updateRes = await visitedCitiesCollection.where({
            mapId,
            _openid: wxContext.OPENID
          }).update({
          data: {
            description: description,
            updateTime: db.serverDate()
          }
        });

        if (updateRes.stats.updated === 0) {
             return { success: false, errMsg: 'No matching record found for user to update.' };
        }
        
        return { success: true, message: 'Description updated successfully for user.', stats: updateRes.stats };
      }
      
      // 4. 新增：获取文案 (用户专属)
      case 'getDescription': {
        const res = await visitedCitiesCollection.where({
            mapId,
            _openid: wxContext.OPENID
          }).field({
            description: true // 仅返回 description 字段
          }).limit(1).get();

        const defaultDescription = '这是一个新的足迹，还没有任何介绍哦！';
        
        return { 
          success: true, 
          data: {
            description: res.data.length > 0 && res.data[0].description !== undefined 
                         ? res.data[0].description 
                         : defaultDescription
          }
        };
      }


      default:
        return { success: false, errMsg: `Unknown action: ${action}` };
    }
  } catch (e) {
    console.error(`[MapService Error] Action: ${action}`, e);
    return { success: false, errMsg: e.message || `Cloud function error for action: ${action}` };
  }
};