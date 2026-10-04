// mock/interceptor.js —— 拦截 wx.request，把 https://localhost:3001/data/*.json 请求路由到本地内存 Mock
// 保持旧页面 wx.request 调用不报错；新页面直接使用 utils/api.js（store）

var store = require('./store.js')

function legacyProduct(g) {
  return {
    image: g.pic, cart_image: g.pic, name: g.name, subtitle: g.subtitle,
    sku: g.sku, stock: g.stock, unit: g.unit,
    product_tags: [{ name: g.tags[0] }],
    non_vip_price_pro: { price_up: { price: g.originalPrice }, price_down: { price: g.price } },
    vip_price_pro: { price_up: { price: g.originalPrice }, price_down: { price: g.vipPrice } },
    price: g.price, vip_price: g.vipPrice, numberSells: g.numberSells, sell_out: g.stock <= 0, type: 'product'
  }
}

function route(url) {
  var d = store.loadDB()
  if (url.indexOf('data.json') >= 0) {
    return {
      categoryAreaV2: { bgImg: '', isShow: 1, lanternArea: d.lanternArea, tileArea: d.tileArea },
      banner: d.banners, products: d.goods.map(legacyProduct), member_level: 2
    }
  }
  if (url.indexOf('detail.json') >= 0) {
    var g = d.goods[0]
    return {
      name: g.name, subtitle: g.subtitle, price: g.price, vip_price: g.vipPrice,
      images: g.images, country: g.origin, delivery_style: '2小时达', promotion: g.tags,
      securityTitle: '安心指纹', securityText: g.tags[0], weight: g.unit, pack: '普装',
      storage_time: '到货即可食用', storage_method: '冷藏', instruction: g.detailImages.map(function (im) { return { image: im } }),
      id: g.id, sku: g.sku, stock: g.stock, market_price: g.originalPrice, description: g.description, image: g.pic, cart_image: g.pic, sales_volume: g.numberSells
    }
  }
  if (url.indexOf('orders.json') >= 0) {
    return { errno: 0, data: d.goods.slice(0, 12).map(function (g) {
      return { icon: g.pic, title: g.name, price: (g.price / 100).toFixed(1) }
    }) }
  }
  if (url.indexOf('searchMsg.json') >= 0) {
    return { msg: 'success', code: 0, success: true, data: d.hotWords, like_result: { product_list: d.goods.map(legacyProduct) } }
  }
  if (url.indexOf('vip.json') >= 0) return d.vip
  if (url.indexOf('me.json') >= 0) {
    return {
      member: d.member.privileges.map(function (p, i) { return { text: p.name, img: '0' + (i + 1) + '.png' } }),
      list: [
        { title: '我的订单', url: '/pages/order/list' },
        { title: '我的余额', color: 'red', value: '0元', url: '' },
        { title: '我的红包', color: 'green', value: d.myCoupons.length + '个', url: '/pages/coupon/index' },
        { title: '我的优惠券', url: '/pages/coupon/index' },
        { title: '我的地址', url: '/pages/address/list' },
        { title: '联系客服', url: '' },
        { title: '意见反馈', url: '' }
      ]
    }
  }
  return null
}

var installed = false
function install() {
  if (installed) return
  installed = true
  var originalRequest = wx.request
  wx.request = function (options) {
    var url = options.url || ''
    var mapped = route(url)
    if (mapped !== null) {
      var ms = 200 + Math.floor(Math.random() * 400)
      setTimeout(function () {
        if (options.success) options.success({ data: mapped, statusCode: 200, errMsg: 'request:ok' })
        if (options.complete) options.complete({ statusCode: 200, errMsg: 'request:ok' })
      }, ms)
      return { abort: function () {} }
    }
    return originalRequest.call(wx, options)
  }
}

module.exports = { install: install }
