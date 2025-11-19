// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  const res = await db.collection('users').doc(OPENID).get().catch(() => null);

  return {
    data: res ? res.data : null
  };
};