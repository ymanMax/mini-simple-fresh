// 统一数据访问层：所有页面通过此模块取数/写操作，统一错误兜底
var mock = require('./mock.js')

function call(fn) {
  var args = Array.prototype.slice.call(arguments, 1)
  return Promise.resolve()
    .then(function () { return fn.apply(null, args) })
    .catch(function (e) {
      console.error('api error', e)
      return { ok: false, msg: '网络异常，请稍后重试', list: [], data: [] }
    })
}

module.exports = {
  install: mock.install,
  api: mock.api,
  // 便捷方法
  home: function () { return call(mock.api.asyncHome) },
  getGoods: function (params) { return call(mock.api.getGoods, params) },
  productDetail: function (params) { return call(mock.api.getProductDetail, params) },
  hotWords: function () { return call(mock.api.hotWords) },
  getCart: function () { return call(mock.api.getCart) },
  addToCart: function (item) { return call(mock.api.addToCart, item) },
  updateCartCount: function (id, count) { return call(mock.api.updateCartCount, id, count) },
  removeCartItem: function (id) { return call(mock.api.removeCartItem, id) },
  clearChecked: function () { return call(mock.api.clearChecked) },
  toggleCheck: function (id, checked) { return call(mock.api.toggleCheck, id, checked) },
  toggleAll: function (checked) { return call(mock.api.toggleAll, checked) },
  getAddresses: function () { return call(mock.api.getAddresses) },
  saveAddress: function (addr) { return call(mock.api.saveAddress, addr) },
  deleteAddress: function (id) { return call(mock.api.deleteAddress, id) },
  setDefaultAddress: function (id) { return call(mock.api.setDefaultAddress, id) },
  couponCenter: function () { return call(mock.api.getCouponCenter) },
  claimCoupon: function (id) { return call(mock.api.claimCoupon, id) },
  userCoupons: function (status) { return call(mock.api.getUserCoupons, status) },
  usableCoupons: function (totalFen) { return mock.api.usableCoupons(totalFen) },
  getOrders: function (params) { return call(mock.api.getOrders, params) },
  orderDetail: function (id) { return call(mock.api.getOrderDetail, id) },
  createOrder: function (data) { return call(mock.api.createOrder, data) },
  cancelOrder: function (id) { return call(mock.api.cancelOrder, id) },
  payOrder: function (id) { return call(mock.api.payOrder, id) },
  confirmReceive: function (id) { return call(mock.api.confirmReceive, id) },
  getReviews: function (goodsId) { return call(mock.api.getReviews, goodsId) },
  submitReview: function (data) { return call(mock.api.submitReview, data) },
  getFavorites: function () { return call(mock.api.getFavorites) },
  toggleFavorite: function (id) { return call(mock.api.toggleFavorite, id) },
  getFootprints: function () { return call(mock.api.getFootprints) },
  clearFootprints: function () { return call(mock.api.clearFootprints) },
  removeFootprint: function (id) { return call(mock.api.removeFootprint, id) },
  clearFavorites: function () { return call(mock.api.clearFavorites) },
  addFootprint: function (id) { mock.api.addFootprint(id) },
  getPointsRecords: function () { return call(mock.api.getPointsRecords) },
  exchange: function (gift) { return call(mock.api.exchange, gift) },
  checkin: function () { return call(mock.api.checkin) },
  getCheckin: function () { return call(mock.api.getCheckin) },
  // 促销
  getPromotions: function () { return call(mock.api.getPromotions) },
  fullReduce: function (totalFen) { return mock.api.fullReduce(totalFen) },
  seckillAddToCart: function (goodsId, count) { return call(mock.api.seckillAddToCart, goodsId, count) },
  // 订单状态推进 / 售后
  advanceOrder: function (id) { return call(mock.api.advanceOrder, id) },
  refundOrder: function (id, reason) { return call(mock.api.refundOrder, id, reason) },
  pushSeckillReminder: function () { return call(mock.api.pushSeckillReminder) },
  // 消息
  getMessages: function () { return call(mock.api.getMessages) },
  readMessage: function (id) { return call(mock.api.readMessage, id) },
  readAllMessages: function () { return call(mock.api.readAllMessages) },
  getMember: function () { return call(mock.api.getMember) },
  DEFAULT_IMG: mock.DEFAULT_IMG
}
