// utils/format.js —— 统一金额/时间格式化（金额底层单位：分）

// 分 → 元（字符串，两位小数）
function yuan(fen) {
  var n = Number(fen) || 0
  return (n / 100).toFixed(2)
}

// 分 → 元数字
function yuanNum(fen) {
  return Math.round(Number(fen) || 0) / 100
}

// 两位小数显示（￥xx.xx）
function money(fen) {
  return '￥' + yuan(fen)
}

// 价格合计（分），避免浮点误差
function sum() {
  var total = 0
  for (var i = 0; i < arguments.length; i++) {
    total += Math.round(Number(arguments[i]) || 0)
  }
  return total
}

// 时间戳 → 'YYYY-MM-DD HH:mm'
function formatTime(ts) {
  var d = new Date(ts)
  var p = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

// 时间戳 → 'YYYY-MM-DD'
function formatDate(ts) {
  var d = new Date(ts)
  var p = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// 距离友好显示
function fromNow(ts) {
  var diff = Date.now() - ts
  var min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return min + '分钟前'
  var h = Math.floor(min / 60)
  if (h < 24) return h + '小时前'
  var day = Math.floor(h / 24)
  if (day < 30) return day + '天前'
  return formatDate(ts)
}

module.exports = {
  yuan: yuan,
  yuanNum: yuanNum,
  money: money,
  sum: sum,
  formatTime: formatTime,
  formatDate: formatDate,
  fromNow: fromNow
}
