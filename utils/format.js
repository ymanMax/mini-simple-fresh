// 金额与时间格式化工具：项目内金额单位统一为「分」，展示时除以 100 转为元
// 禁止字符串价格参与计算，所有价格计算先通过 toFen 转数字

// 分 -> 元（数字）
function toYuan(fen) {
  var n = Number(fen)
  if (isNaN(n)) n = 0
  return n / 100
}

// 分 -> 元（字符串，两位小数）
function fen2yuan(fen) {
  return toYuan(fen).toFixed(2)
}

// 带人民币符号：¥29.90
function formatPrice(fen) {
  return '¥' + fen2yuan(fen)
}

// 元（数字）-> 分（数字）
function toFen(yuan) {
  var n = Number(yuan)
  if (isNaN(n)) n = 0
  return Math.round(n * 100)
}

// 分相加（避免浮点误差）
function sumFen() {
  var total = 0
  for (var i = 0; i < arguments.length; i++) {
    total += Math.round(Number(arguments[i]) || 0)
  }
  return total
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

// 时间戳 -> YYYY-MM-DD HH:mm
function formatTime(ts) {
  var d = ts ? new Date(ts) : new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function formatDate(ts) {
  var d = ts ? new Date(ts) : new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

// 生成订单号：年月日 + 随机数字
function genOrderNo() {
  var d = new Date()
  var base = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
  var rand = ''
  for (var i = 0; i < 8; i++) rand += Math.floor(Math.random() * 10)
  return base + rand
}

// 倒计时文案：ms -> "xx:xx:xx"
function countDown(ms) {
  if (ms <= 0) return '00:00:00'
  var s = Math.floor(ms / 1000)
  var h = Math.floor(s / 3600)
  var m = Math.floor((s % 3600) / 60)
  var sec = s % 60
  return pad(h) + ':' + pad(m) + ':' + pad(sec)
}

module.exports = {
  toYuan: toYuan,
  fen2yuan: fen2yuan,
  formatPrice: formatPrice,
  toFen: toFen,
  sumFen: sumFen,
  formatTime: formatTime,
  formatDate: formatDate,
  genOrderNo: genOrderNo,
  countDown: countDown,
  pad: pad
}
