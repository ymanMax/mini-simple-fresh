// 金额统一单位：分（整数）。禁止字符串价格参与计算。
// fen -> "29.90"
function fenToYuan(fen) {
  return ((Number(fen) || 0) / 100).toFixed(2)
}
// fen -> "￥29.90"
function yuan(fen) {
  return '￥' + fenToYuan(fen)
}
// 整数分加减：add(100, 200) => 300
function add() {
  var s = 0
  for (var i = 0; i < arguments.length; i++) s += Number(arguments[i]) || 0
  return s
}
function sub(a, b) { return (Number(a) || 0) - (Number(b) || 0) }
// 折扣券：discount=88 表示8.8折，返回分
function discountPrice(priceFen, discount) {
  return Math.round(priceFen * Number(discount) / 100)
}
// 格式化时间：Date -> "2026-10-04 12:00:00"
function formatTime(d) {
  d = d || new Date()
  function p(n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}
function todayStr() {
  var d = new Date()
  function p(n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
module.exports = {
  fenToYuan: fenToYuan,
  yuan: yuan,
  add: add,
  sub: sub,
  discountPrice: discountPrice,
  formatTime: formatTime,
  todayStr: todayStr
}
