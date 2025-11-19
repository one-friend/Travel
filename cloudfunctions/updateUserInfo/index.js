// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database();

exports.main = async (event, context) => {
  const { userInfo } = event;
  const { OPENID } = cloud.getWXContext();
  // 删除不能更新的字段
  delete userInfo._id;
  delete userInfo._openid; // 保险，但一般不会有
  return await db.collection('users').doc(OPENID).set({
    data: {
      ...userInfo,
      updatedAt: Date.now()
    }
  });
};
