// utils/format.js —— 金额（分→元）、时间、展示格式化
// 所有 price 字段为分（整数），禁止字符串价格参与计算

// 分 → 元字符串（两位小数），如 2990 → "29.90"
function fen2yuan(fen) {
  var n = Number(fen) || 0
  return (n / 100).toFixed(2)
}

// 元显示：¥29.90
function yuan(fen) {
  return '¥' + fen2yuan(fen)
}

// 紧凑显示：29.9（去掉末尾0）
function yuanShort(fen) {
  var n = (Number(fen) || 0) / 100
  return parseFloat(n.toFixed(2)).toString()
}

// 分相加后返回分（避免浮点误差）
function sumFen() {
  var s = 0
  for (var i = 0; i < arguments.length; i++) s += Number(arguments[i]) || 0
  return Math.round(s)
}

// 时间格式化：Date → 'YYYY-MM-DD HH:mm'
function formatDate(d) {
  if (typeof d === 'string') return d
  function p(x) { return x < 10 ? '0' + x : x }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

// 订单状态映射
var ORDER_STATUS = {
  1: '待付款', 2: '待发货', 3: '配送中', 4: '待收货', 5: '已完成', 6: '已取消', 7: '退款成功'
}

function statusName(s) { return ORDER_STATUS[s] || '未知' }

// 优惠券类型文案
function couponText(c) {
  if (c.type === 3) return '无门槛' + (c.discount / 100).toFixed(0) + '元券'
  if (c.type === 2) return (c.discount / 10).toFixed(1) + '折券'
  return '满' + (c.threshold / 100).toFixed(0) + '减' + (c.discount / 100).toFixed(0) + '元'
}

module.exports = {
  fen2yuan: fen2yuan, yuan: yuan, yuanShort: yuanShort, sumFen: sumFen,
  formatDate: formatDate, statusName: statusName, couponText: couponText, ORDER_STATUS: ORDER_STATUS
}
