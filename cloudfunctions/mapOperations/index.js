const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const userMapsCollection = db.collection('userMaps'); // 存储地图列表
const visitedCitiesCollection = db.collection('visitedCities'); // 存储城市数据

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, mapInfo, mapId, newName } = event;

  switch (action) {
    // --- 查：获取用户所有足迹地图 ---
    case 'getMaps': {
      try {
        const res = await userMapsCollection.where({ openid }).limit(1).get();
        // 如果有记录，返回 maps 字段，否则返回空数组
        return { 
            data: res.data.length > 0 ? res.data[0].maps : [] 
        };
      } catch (e) {
        console.error('getMaps 失败', e);
        return { data: [] };
      }
    }

    // --- 增：创建新的足迹地图 (包含首次创建/初始化) ---
    case 'createMap': {
      // 1. 尝试在 userMaps 中添加新的地图项
      const updateRes = await userMapsCollection.where({ openid }).update({
        data: {
          maps: _.push(mapInfo)
        }
      });

      // 如果更新失败 (即用户第一次创建, 数据库中没有该用户的 openid 记录), 则新增一条记录
      if (updateRes.stats.updated === 0) {
        await userMapsCollection.add({
          data: {
            openid,
            maps: [mapInfo] // 此时 maps 数组只包含一个地图
          }
        });
      }

      // 2. 在 visitedCities 中为新地图创建空的城市记录 (保持数据结构一致)
      await visitedCitiesCollection.add({
        data: {
          mapId: mapInfo.id,
          cities: {}
        }
      });
      return { success: true };
    }
    
    // --- 改：重命名足迹地图 ---
    case 'renameMap': {
      await userMapsCollection.where({ openid, 'maps.id': mapId }).update({
        data: {
          // 使用 $[] 语法 (需要云开发环境支持)
          'maps.$.name': newName 
        }
      });
      return { success: true };
    }

    // --- 删：删除足迹地图及关联数据 ---
    case 'deleteMap': {
      // 1. 从 userMaps 集合中删除该地图项
      await userMapsCollection.where({ openid }).update({
        data: {
          maps: _.pull({ id: mapId }) // 删除 maps 数组中 id 匹配的项
        }
      });

      // 2. 从 visitedCities 集合中删除关联的城市数据
      await visitedCitiesCollection.where({ mapId }).remove();

      return { success: true };
    }
    
    default:
      return { success: false, error: '无效的action' };
  }
};