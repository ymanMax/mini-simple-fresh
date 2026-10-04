// 把后端（分）数据装饰成展示字段（元，两位小数），页面 WXML 只使用 *Yuan 字段
var F = require('./format.js')

function goods(g) {
  if (!g) return g
  return Object.assign({}, g, {
    priceYuan: F.fenToYuan(g.price),
    originPriceYuan: F.fenToYuan(g.originalPrice),
    vipPriceYuan: F.fenToYuan(g.vipPrice),
    memberPriceYuan: F.fenToYuan(g.memberPrice || g.vipPrice),
    totalYuan: g.price ? F.fenToYuan(g.price * (g.count || 1)) : '0.00'
  })
}
function cartItem(it) {
  return Object.assign({}, it, {
    priceYuan: F.fenToYuan(it.price),
    totalYuan: F.fenToYuan(it.price * it.count)
  })
}
function order(o) {
  if (!o) return o
  return Object.assign({}, o, {
    totalAmountYuan: F.fenToYuan(o.totalAmount),
    discountAmountYuan: F.fenToYuan(o.discountAmount),
    fullReduceAmountYuan: F.fenToYuan(o.fullReduceAmount || 0),
    freightYuan: F.fenToYuan(o.freight),
    payAmountYuan: F.fenToYuan(o.payAmount),
    items: (o.items || []).map(function(it) {
      return Object.assign({}, it, { priceYuan: F.fenToYuan(it.price), totalYuan: F.fenToYuan(it.price * it.count) })
    })
  })
}
function coupon(c) {
  return Object.assign({}, c, {
    discountYuan: c.type === 2 ? (c.discount / 10).toFixed(1) + '折' : F.fenToYuan(c.discount),
    thresholdYuan: F.fenToYuan(c.threshold),
    conditionText: c.threshold > 0 ? '满' + F.fenToYuan(c.threshold) + '可用' : '无门槛'
  })
}
function list(arr, fn) { return (arr || []).map(fn || goods) }

module.exports = { goods: goods, cartItem: cartItem, order: order, coupon: coupon, list: list }
