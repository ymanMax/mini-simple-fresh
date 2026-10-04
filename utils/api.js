// 统一请求封装：所有页面通过它访问 Mock 数据层（wx.request 已被 app.js 拦截）
function req(url, data, method) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: '/api' + url,
      data: data || {},
      method: method || 'GET',
      success: function(res) {
        var body = res.data
        if (body && body.errno === 0) resolve(body.data)
        else reject(new Error((body && body.msg) || '请求失败'))
      },
      fail: function(err) { reject(err) }
    })
  })
}

var api = {
  home: function() { return req('/home') },
  goodsList: function(params) { return req('/goods', params) },
  goodsDetail: function(sku) { return req('/goods/detail', { sku: sku }) },
  hotWords: function() { return req('/search/hot') },
  suggest: function(kw) { return req('/search/suggest', { kw: kw }) },
  searchResults: function(params) { return req('/search/results', params) },
  cart: function() { return req('/cart') },
  addCart: function(sku, specText, count) { return req('/cart/add', { sku: sku, specText: specText, count: count }, 'POST') },
  cartUpdate: function(id, count, checked) { return req('/cart/update', { id: id, count: count, checked: checked }, 'POST') },
  cartRemove: function(id) { return req('/cart/remove', { id: id }, 'POST') },
  cartCheckAll: function(checked) { return req('/cart/checkAll', { checked: checked }, 'POST') },
  cartClearInvalid: function() { return req('/cart/clearInvalid', {}, 'POST') },
  orders: function(params) { return req('/orders', params) },
  orderDetail: function(id) { return req('/order/detail', { id: id }) },
  createOrder: function(payload) { return req('/order/create', payload, 'POST') },
  payOrder: function(id) { return req('/order/pay', { id: id }, 'POST') },
  cancelOrder: function(id) { return req('/order/cancel', { id: id }, 'POST') },
  confirmOrder: function(id) { return req('/order/confirm', { id: id }, 'POST') },
  submitReview: function(payload) { return req('/order/review', payload, 'POST') },
  addresses: function() { return req('/addresses') },
  saveAddress: function(payload) { return req('/address/save', payload, 'POST') },
  deleteAddress: function(id) { return req('/address/delete', { id: id }, 'POST') },
  setDefaultAddress: function(id) { return req('/address/default', { id: id }, 'POST') },
  couponCenter: function() { return req('/coupons/center') },
  myCoupons: function(status) { return req('/coupons/my', { status: status }) },
  claimCoupon: function(id) { return req('/coupon/claim', { id: id }, 'POST') },
  points: function(page) { return req('/points', { page: page || 1 }) },
  exchange: function(productId) { return req('/points/exchange', { productId: productId }, 'POST') },
  checkin: function() { return req('/checkin', {}, 'POST') },
  checkinMonth: function() { return req('/checkin/month') },
  advanceOrder: function(id) { return req('/order/advance', { id: id }, 'POST') },
  refundOrder: function(id, reason) { return req('/order/refund', { id: id, reason: reason }, 'POST') },
  pushDemoMessage: function() { return req('/message/pushDemo', {}, 'POST') },
  messages: function() { return req('/messages') },
  readMessage: function(id) { return req('/message/read', { id: id }, 'POST') },
  readAllMessages: function() { return req('/message/readAll', {}, 'POST') },
  favorites: function() { return req('/favorites') },
  toggleFavorite: function(sku) { return req('/favorite/toggle', { sku: sku }, 'POST') },
  footprints: function() { return req('/footprints') },
  recordFootprint: function(sku) { return req('/footprint/record', { sku: sku }, 'POST') },
  removeFootprint: function(sku) { return req('/footprint/remove', { sku: sku }, 'POST') },
  clearFootprints: function() { return req('/footprint/clear', {}, 'POST') },
  groupbuys: function() { return req('/groupbuys') },
  joinGroupbuy: function(id) { return req('/groupbuy/join', { id: id }, 'POST') },
  member: function() { return req('/member') },
  promotions: function() { return req('/promotions') },
  vip: function() { return req('/vip') },
  me: function() { return req('/me') }
}

module.exports = api
