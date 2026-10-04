// 内存 Mock 数据库：模块级单例 + wx.setStorageSync 持久化
// 所有金额内部单位为“分”（整数），禁止字符串参与计算。
var seed = require('./seed.js')
var F = require('../format.js')

// ---------- 持久化 ----------
var KEYS = ['cart', 'orders', 'addresses', 'coupons', 'pointsBalance', 'pointsRecords',
  'messages', 'favorites', 'footprints', 'checkin', 'userReviews', 'member']

function load(key) {
  try { return wx.getStorageSync('fl_' + key) } catch (e) { return null }
}
function save(key, val) {
  try { wx.setStorageSync('fl_' + key, val) } catch (e) {}
}

// 类型安全加载：存储里可能是字符串/数字/null 等脏数据，必须按类型校验，
// 否则会出现 "Cannot create property 'xxx' on string ''" 这类运行时崩溃。
function loadArr(key, def) {
  var v = load(key)
  return Array.isArray(v) ? v : (def ? clone(def) : [])
}
function loadObj(key, def) {
  var v = load(key)
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : clone(def)
}
function loadNum(key, def) {
  var v = load(key)
  return (typeof v === 'number' && !isNaN(v)) ? v : def
}

// ---------- 初始化 ----------
var store = {}
function init() {
  store.goods = seed.goods
  store.banners = seed.banners
  store.navArea = seed.navArea
  store.categories = seed.categories
  store.promotions = seed.promotions
  store.groupbuys = seed.groupbuys
  store.couponCenter = seed.couponCenter
  store.hotWords = seed.hotWords
  store.vip = seed.vip
  store.me = seed.me
  store.reviews = seed.reviews

  store.cart = loadArr('cart', [])
  store.orders = loadArr('orders', seed.orders)
  store.addresses = loadArr('addresses', seed.addresses)
  store.coupons = loadArr('coupons', seed.ownedCoupons)
  store.pointsBalance = loadNum('pointsBalance', 320)
  store.pointsRecords = loadArr('pointsRecords', seed.pointsRecords)
  store.messages = loadArr('messages', seed.messages)
  store.favorites = loadArr('favorites', [])
  store.footprints = loadArr('footprints', [])
  store.userReviews = loadArr('userReviews', [])
  store.member = loadObj('member', seed.member)

  // 签到对象：必须是对象，且字段类型正确（防字符串脏数据崩溃）
  var ck = load('checkin')
  store.checkin = (ck && typeof ck === 'object' && !Array.isArray(ck)) ? ck : { lastDate: '', streak: 0, monthRecords: [] }
  if (typeof store.checkin.lastDate !== 'string') store.checkin.lastDate = ''
  if (typeof store.checkin.streak !== 'number') store.checkin.streak = 0
  if (!Array.isArray(store.checkin.monthRecords)) store.checkin.monthRecords = []
}
function clone(o) { return JSON.parse(JSON.stringify(o)) }
init()

function persist(key) { save(key, store[key]) }

// ---------- 工具 ----------
function findGoods(sku) {
  for (var i = 0; i < store.goods.length; i++) if (store.goods[i].sku === sku) return store.goods[i]
  return null
}
function findOrder(id) {
  for (var i = 0; i < store.orders.length; i++) if (store.orders[i].id === Number(id)) return store.orders[i]
  return null
}
function paginate(list, page, size) {
  page = Number(page) || 1
  size = Number(size) || 10
  var start = (page - 1) * size
  return { list: list.slice(start, start + size), total: list.length, page: page, hasMore: start + size < list.length }
}
function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms || (200 + Math.random() * 400)) })
}
function ok(data) { return { errno: 0, msg: 'ok', data: data } }
function fail(msg) { return { errno: 1, msg: msg || '操作失败', data: null } }

// ---------- 购物车 ----------
function enrichCart() {
  return store.cart.map(function(it) {
    var g = findGoods(it.sku)
    if (!g) return null
    return {
      id: it.id, sku: it.sku, name: g.name, pic: g.pic, specText: it.specText,
      price: g.price, count: it.count, checked: !!it.checked,
      stock: g.stock, invalid: g.stock <= 0, unit: g.unit, vipPrice: g.vipPrice
    }
  }).filter(Boolean)
}
function addToCart(sku, specText, count) {
  var g = findGoods(sku)
  if (!g) return fail('商品不存在')
  count = Math.max(1, Math.min(Number(count) || 1, g.stock))
  specText = specText || '标准装 · 1份'
  for (var i = 0; i < store.cart.length; i++) {
    var it = store.cart[i]
    if (it.sku === sku && it.specText === specText) {
      it.count = Math.min(it.count + count, g.stock)
      persist('cart')
      return ok({ count: it.count })
    }
  }
  store.cart.push({ id: 'c' + Date.now() + '_' + i, sku: sku, specText: specText, count: count, checked: true })
  persist('cart')
  return ok({ count: count })
}

// ---------- 订单 ----------
// 满减阶梯：满59减8 / 满99减20 / 满199减50（单位：分），按最高可享自动减免
function fullReductionFor(total) {
  var rules = [[19900, 5000], [9900, 2000], [5900, 800]]
  for (var i = 0; i < rules.length; i++) { if (total >= rules[i][0]) return rules[i][1] }
  return 0
}
function computeOrder(items, couponId, addressId) {
  var total = 0
  items.forEach(function(it) {
    var g = findGoods(it.sku || it.goodsId)
    var price = it.price || (g && g.price) || 0
    total += price * it.count
  })
  var fullReduction = fullReductionFor(total)
  var discount = 0, coupon = null
  if (couponId) {
    coupon = store.coupons.find(function(c) { return (c.id === Number(couponId) || c.couponId === Number(couponId)) && c.status === 1 })
    if (coupon) {
      // 优惠券门槛按商品总价判断；先满减后用券
      if (coupon.type === 1) {
        if (total >= coupon.threshold) discount = coupon.discount
      } else {
        if (total >= coupon.threshold) discount = F.discountPrice(total - fullReduction, coupon.discount)
      }
    }
  }
  // 会员免配送费门槛：银卡及以上 39 元，普通 59 元（按优惠后金额判断）
  var freeThreshold = store.member.level >= 2 ? 3900 : 5900
  var afterDiscount = total - fullReduction - discount
  var freight = afterDiscount >= freeThreshold ? 0 : 600
  var payAmount = afterDiscount + freight
  return { total: total, fullReduction: fullReduction, discount: discount, freight: freight, payAmount: payAmount, coupon: coupon }
}

function createOrder(payload) {
  var items = payload.items || []
  if (!items.length) return fail('购物车没有结算商品')
  var address = store.addresses.find(function(a) { return a.id === Number(payload.addressId) })
  if (!address) return fail('请选择收货地址')
  // 校验库存
  for (var i = 0; i < items.length; i++) {
    var g = findGoods(items[i].sku)
    if (!g) return fail('商品不存在：' + items[i].sku)
    if (g.stock < items[i].count) return fail('「' + g.name + '」库存不足')
  }
  var calc = computeOrder(items, payload.couponId, payload.addressId)
  if (payload.couponId && !calc.coupon) return fail('优惠券不可用')
  // 扣库存
  items.forEach(function(it) { findGoods(it.sku).stock -= it.count })
  // 移除购物车已结算项
  var boughtKeys = {}
  items.forEach(function(it) { boughtKeys[it.sku + '|' + it.specText] = true })
  store.cart = store.cart.filter(function(it) { return !boughtKeys[it.sku + '|' + it.specText] })
  persist('cart')
  // 优惠券标记已使用
  if (calc.coupon) { calc.coupon.status = 2; persist('coupons') }
  var now = F.formatTime(new Date())
  var orderNo = 'FL' + now.replace(/[-: ]/g, '').slice(0, 14) + String(Math.floor(Math.random() * 900) + 100)
  var isCod = (payload.payType || 1) === 2
  // 货到付款：下单即视为已支付（商家接单发货），状态为待发货(2)；微信支付：待付款(1)
  var timeline = [{ time: now, status: '已下单', remark: '订单提交成功' }]
  if (isCod) {
    timeline.push({ time: now, status: '已支付', remark: '货到付款，骑手上门收款' })
    timeline.push({ time: now, status: '商家分拣', remark: '商品分拣完成，正在打包' })
  }
  var order = {
    id: Date.now(), orderNo: orderNo, status: isCod ? 2 : 1,
    items: items.map(function(it) {
      var g = findGoods(it.sku)
      return { goodsId: g.sku, name: g.name, pic: g.pic, specText: it.specText, price: g.price, count: it.count }
    }),
    totalAmount: calc.total, discountAmount: calc.discount, fullReduceAmount: calc.fullReduction, freight: calc.freight,
    payAmount: calc.payAmount, couponId: calc.coupon ? calc.coupon.id : null,
    couponTitle: calc.coupon ? calc.coupon.name : null,
    payType: payload.payType || 1, remark: payload.remark || '',
    deliveryDate: '今天', deliverySlot: payload.deliverySlot || '尽快送达（预计45分钟）',
    addressSnapshot: { name: address.name, phone: address.phone, detail: address.province + address.city + address.district + address.detail },
    rider: { name: '王骑手', phone: '13700001234' },
    timeline: timeline,
    isReviewed: false, createTime: now
  }
  store.orders.unshift(order)
  persist('orders')
  // 购物返积分
  addPoints(Math.floor(calc.payAmount / 100), 1, '购物消费返积分')
  if (calc.fullReduction > 0) addMessage(3, '满减优惠生效', '订单 ' + orderNo + ' 已享满减优惠 ' + F.fenToYuan(calc.fullReduction) + ' 元。', order.id)
  addMessage(2, isCod ? '订单已提交' : '订单已创建', isCod ? ('订单 ' + orderNo + ' 已提交，货到付款，商家正在分拣。') : ('您的订单 ' + orderNo + ' 已提交，请尽快完成支付。'), order.id)
  return ok(order)
}

function payOrder(id) {
  var o = findOrder(id)
  if (!o) return fail('订单不存在')
  if (o.status !== 1) return fail('订单状态不支持支付')
  o.status = 2
  var now = F.formatTime(new Date())
  o.timeline.push({ time: now, status: '已支付', remark: '微信支付成功，等待商家发货' })
  persist('orders')
  addMessage(2, '支付成功', '订单 ' + o.orderNo + ' 支付成功，商家正在分拣。', o.id)
  return ok(o)
}
function cancelOrder(id) {
  var o = findOrder(id)
  if (!o) return fail('订单不存在')
  if (o.status !== 1) return fail('只有待付款订单可以取消')
  o.status = 6
  var now = F.formatTime(new Date())
  o.timeline.push({ time: now, status: '已取消', remark: '用户取消订单，退款已原路退回' })
  persist('orders')
  return ok(o)
}
function confirmOrder(id) {
  var o = findOrder(id)
  if (!o) return fail('订单不存在')
  if (o.status !== 4) return fail('只有待收货订单可以确认收货')
  o.status = 5
  var now = F.formatTime(new Date())
  o.timeline.push({ time: now, status: '已送达', remark: '确认收货成功，感谢品尝' })
  persist('orders')
  return ok(o)
}
function submitReview(payload) {
  var o = findOrder(payload.orderId)
  if (!o) return fail('订单不存在')
  if (o.isReviewed) return fail('该订单已评价')
  var now = F.formatTime(new Date())
  ;(payload.items || []).forEach(function(ri) {
    store.userReviews.push({
      id: Date.now() + Math.floor(Math.random() * 100), orderId: o.id, goodsId: ri.sku,
      userId: 'u1001', userName: '我', avatar: '/images/avatar.png', score: ri.score,
      tags: ri.tags || [], content: ri.content, images: ri.images || [], createTime: now
    })
  })
  o.isReviewed = true
  persist('userReviews'); persist('orders')
  addPoints(20, 3, '商品评价奖励')
  addMessage(4, '评价成功', '感谢评价，已获得20积分奖励。', o.id)
  return ok(o)
}

// ---------- 地址 ----------
function saveAddress(payload) {
  if (!payload.name || !payload.phone || !payload.detail) return fail('请填写完整收货信息')
  if (!/^1\d{10}$/.test(payload.phone)) return fail('手机号格式不正确')
  var data = {
    name: payload.name, phone: payload.phone, province: payload.province || '北京市',
    city: payload.city || '北京市', district: payload.district || '', detail: payload.detail,
    tag: payload.tag || '家', isDefault: !!payload.isDefault, distanceKm: payload.distanceKm || 5
  }
  if (payload.id) {
    var idx = store.addresses.findIndex(function(a) { return a.id === Number(payload.id) })
    if (idx >= 0) { data.id = Number(payload.id); store.addresses[idx] = data }
  } else {
    data.id = Date.now()
    store.addresses.push(data)
  }
  if (data.isDefault) store.addresses.forEach(function(a) { a.isDefault = (a.id === data.id) })
  persist('addresses')
  return ok(data)
}
function deleteAddress(id) {
  store.addresses = store.addresses.filter(function(a) { return a.id !== Number(id) })
  persist('addresses')
  return ok(null)
}
function setDefaultAddress(id) {
  store.addresses.forEach(function(a) { a.isDefault = (a.id === Number(id)) })
  persist('addresses')
  return ok(store.addresses)
}

// ---------- 优惠券 ----------
function claimCoupon(id) {
  var center = store.couponCenter.find(function(c) { return c.id === Number(id) })
  if (!center) return fail('优惠券不存在')
  if (store.coupons.some(function(c) { return c.couponId === center.id && c.status === 1 })) return fail('您已领取过该券')
  if (center.remaining <= 0) return fail('该券已被抢光')
  center.remaining -= 1
  store.coupons.push({
    id: Date.now(), name: center.name, type: center.type, threshold: center.threshold,
    discount: center.discount, scope: center.scope, status: 1, expireTime: center.expireTime,
    source: center.source, couponId: center.id
  })
  persist('coupons')
  addMessage(3, '领券成功', '优惠券「' + center.name + '」已放入我的优惠券。', null)
  return ok(center)
}

// ---------- 积分 ----------
function addPoints(n, type, desc) {
  store.pointsBalance += n
  store.pointsRecords.unshift({ id: Date.now() + Math.floor(Math.random() * 100), type: type, points: n, desc: desc, createTime: F.formatTime(new Date()) })
  persist('pointsBalance'); persist('pointsRecords')
}
var EXCHANGE_GOODS = {
  ex1: { cost: 100, name: '10元无门槛券', coupon: { id: 0, name: '10元无门槛券', type: 1, threshold: 0, discount: 1000, scope: '全场通用', status: 1, expireTime: '2026-12-31 23:59:59', source: '积分兑换', couponId: 4 } },
  ex2: { cost: 300, name: '水果叉套装（实物）' },
  ex3: { cost: 500, name: '满99减30券', coupon: { id: 0, name: '满99减30生鲜券', type: 1, threshold: 9900, discount: 3000, scope: '全场通用', status: 1, expireTime: '2026-12-31 23:59:59', source: '积分兑换', couponId: 99 } },
  ex4: { cost: 880, name: '当季水果3斤装（实物）' }
}
function exchange(productId) {
  var ex = EXCHANGE_GOODS[productId]
  if (!ex) return fail('兑换商品不存在')
  if (store.pointsBalance < ex.cost) return fail('积分不足')
  store.pointsBalance -= ex.cost
  store.pointsRecords.unshift({ id: Date.now(), type: 4, points: -ex.cost, desc: '兑换' + ex.name, createTime: F.formatTime(new Date()) })
  if (ex.coupon) { ex.coupon.id = Date.now(); store.coupons.push(ex.coupon) }
  persist('pointsBalance'); persist('pointsRecords'); persist('coupons')
  addMessage(3, '兑换成功', '您已成功兑换「' + ex.name + '」。', null)
  return ok(ex)
}
// 7 天一循环签到奖励：+5/+5/+10/+10/+15/+20/+50
var CHECKIN_REWARDS = [5, 5, 10, 10, 15, 20, 50]
function checkin() {
  var today = F.todayStr()
  if (store.checkin.lastDate === today) return fail('今日已签到，明天再来吧')
  store.checkin.lastDate = today
  store.checkin.streak += 1
  var dayIndex = (store.checkin.streak - 1) % 7
  var reward = CHECKIN_REWARDS[dayIndex]
  store.checkin.monthRecords = store.checkin.monthRecords || []
  if (store.checkin.monthRecords.indexOf(today) < 0) store.checkin.monthRecords.push(today)
  persist('checkin')
  addPoints(reward, 2, '每日签到奖励（连签第' + store.checkin.streak + '天）')
  addMessage(1, '签到成功', '连续签到' + store.checkin.streak + '天，获得' + reward + '积分。', null)
  return ok({ streak: store.checkin.streak, points: store.pointsBalance, reward: reward })
}
function checkinMonth() {
  return ok({ checkin: store.checkin, rewards: CHECKIN_REWARDS })
}

// ---------- 物流模拟推进 / 售后退款 ----------
function advanceOrder(id) {
  var o = findOrder(id)
  if (!o) return fail('订单不存在')
  var now = F.formatTime(new Date())
  if (o.status === 2) {
    o.status = 3
    o.timeline.push({ time: now, status: '商家分拣完成', remark: '商品分拣打包完成，骑手即将取货' })
    o.timeline.push({ time: now, status: '骑手已取货', remark: '骑手' + o.rider.name + '已取货，正在配送中' })
    addMessage(2, '骑手已取货', '订单 ' + o.orderNo + ' 骑手已取货，正在配送，预计45分钟送达。', o.id)
  } else if (o.status === 3) {
    o.status = 4
    o.timeline.push({ time: now, status: '已送达站点', remark: '包裹已到达配送站点，骑手正在派送，请保持电话畅通' })
    addMessage(2, '订单派送中', '订单 ' + o.orderNo + ' 正在派送，请准备签收。', o.id)
  } else if (o.status === 4) {
    o.status = 5
    o.timeline.push({ time: now, status: '已送达', remark: '确认收货成功，感谢品尝' })
    addMessage(2, '订单已送达', '订单 ' + o.orderNo + ' 已送达，感谢品尝，期待您的评价。', o.id)
  } else {
    return fail('当前订单状态不支持推进（仅待发货/配送中/待收货可模拟推进）')
  }
  persist('orders')
  return ok(o)
}
function refundOrder(id, reason) {
  var o = findOrder(id)
  if (!o) return fail('订单不存在')
  if (o.status !== 5) return fail('仅已完成订单可申请退款')
  if (!reason) return fail('请选择退款原因')
  o.status = 7
  o.refund = { reason: reason, amount: o.payAmount, time: F.formatTime(new Date()) }
  o.timeline.push({ time: o.refund.time, status: '退款成功', remark: '退款原因：' + reason + '，' + F.fenToYuan(o.payAmount) + '元原路退回' })
  persist('orders')
  addMessage(2, '退款成功', '订单 ' + o.orderNo + ' 退款成功，' + F.fenToYuan(o.payAmount) + '元已原路退回。', o.id)
  return ok(o)
}

// ---------- 消息：mock 延迟推送 ----------
function pushDemoMessage() {
  var exists = store.messages.find(function(m) { return m.title.indexOf('20:00') >= 0 })
  if (exists) return ok(store.messages)
  addMessage(3, '限时抢购20:00场即将开始', '今晚20:00-22:00限时秒杀场即将开始，爆款小龙虾低至69.9元，先到先得。', null)
  return ok(store.messages)
}

// ---------- 消息 / 收藏 / 足迹 ----------
function addMessage(type, title, content, relatedId) {
  store.messages.unshift({ id: Date.now() + Math.floor(Math.random() * 100), type: type, title: title, content: content, isRead: false, createTime: F.formatTime(new Date()), relatedId: relatedId })
  persist('messages')
}
function toggleFavorite(sku) {
  var idx = store.favorites.indexOf(sku)
  if (idx >= 0) { store.favorites.splice(idx, 1); persist('favorites'); return ok({ isCollect: false }) }
  store.favorites.push(sku); persist('favorites'); return ok({ isCollect: true })
}
function recordFootprint(sku) {
  store.footprints = store.footprints.filter(function(f) { return f.sku !== sku })
  store.footprints.unshift({ sku: sku, time: F.formatTime(new Date()) })
  if (store.footprints.length > 50) store.footprints = store.footprints.slice(0, 50)
  persist('footprints')
}
function removeFootprint(sku) {
  store.footprints = store.footprints.filter(function(f) { return f.sku !== sku })
  persist('footprints')
  return ok(store.footprints)
}
function clearFootprints() {
  store.footprints = []
  persist('footprints')
  return ok(null)
}
function joinGroupbuy(id) {
  const gb = store.groupbuys.find(g => g.id === Number(id))
  if (!gb) return fail('拼团活动不存在')
  if (gb.status !== 1) return fail('该拼团已结束')
  if (gb.joinedCount >= gb.requiredCount) return fail('拼团已满员')
  gb.joinedCount += 1
  gb.members.push({ avatar: '/images/avatar.png', name: '我', isLeader: false })
  if (gb.joinedCount >= gb.requiredCount) gb.status = 2
  addMessage(3, '拼团进度', '您参与的拼团「' + gb.name + '」人数更新：' + gb.joinedCount + '/' + gb.requiredCount + '。', gb.id)
  return ok(gb)
}

// ---------- 路由 ----------
function route(method, path, data) {
  data = data || {}
  // ---- GET ----
  if (path === '/api/home') return ok({ banners: store.banners, navArea: store.navArea, categories: store.categories, goods: store.goods })
  if (path === '/api/goods' && data.sku) return detail(data.sku)
  if (path === '/api/goods') return goodsList(data)
  if (path === '/api/goods/detail') return detail(data.sku)
  if (path === '/api/search/hot') return ok(store.hotWords)
  if (path === '/api/search/suggest') return suggest(data.kw)
  if (path === '/api/search/results') return searchResults(data)
  if (path === '/api/cart') return ok(enrichCart())
  if (path === '/api/orders') return ordersList(data)
  if (path === '/api/order/detail') return orderDetail(data.id)
  if (path === '/api/addresses') return ok(store.addresses)
  if (path === '/api/coupons/center') return ok(store.couponCenter)
  if (path === '/api/coupons/my') return myCoupons(data.status)
  if (path === '/api/points') return ok({ balance: store.pointsBalance, records: paginate(store.pointsRecords, data.page, 10) })
  if (path === '/api/messages') return ok(store.messages)
  if (path === '/api/favorites') return favorites()
  if (path === '/api/footprints') return footprints()
  if (path === '/api/groupbuys') return ok(store.groupbuys)
  if (path === '/api/member') return ok(store.member)
  if (path === '/api/promotions') return ok(store.promotions)
  if (path === '/api/vip') return ok(store.vip)
  if (path === '/api/me') return ok(store.me)

  // ---- POST ----
  if (path === '/api/cart/add') return addToCart(data.sku, data.specText, data.count)
  if (path === '/api/cart/update') return cartUpdate(data)
  if (path === '/api/cart/remove') return cartRemove(data.id)
  if (path === '/api/cart/checkAll') return cartCheckAll(data.checked)
  if (path === '/api/cart/clearInvalid') { store.cart = store.cart.filter(function(it) { var g = findGoods(it.sku); return g && g.stock > 0 }); persist('cart'); return ok(enrichCart()) }
  if (path === '/api/order/create') return createOrder(data)
  if (path === '/api/order/pay') return payOrder(data.id)
  if (path === '/api/order/cancel') return cancelOrder(data.id)
  if (path === '/api/order/confirm') return confirmOrder(data.id)
  if (path === '/api/order/review') return submitReview(data)
  if (path === '/api/address/save') return saveAddress(data)
  if (path === '/api/address/delete') return deleteAddress(data.id)
  if (path === '/api/address/default') return setDefaultAddress(data.id)
  if (path === '/api/coupon/claim') return claimCoupon(data.id)
  if (path === '/api/points/exchange') return exchange(data.productId)
  if (path === '/api/checkin') return checkin()
  if (path === '/api/checkin/month') return checkinMonth()
  if (path === '/api/order/advance') return advanceOrder(data.id)
  if (path === '/api/order/refund') return refundOrder(data.id, data.reason)
  if (path === '/api/message/pushDemo') return pushDemoMessage()
  if (path === '/api/message/read') { store.messages.forEach(function(m) { if (m.id === Number(data.id)) m.isRead = true }); persist('messages'); return ok(store.messages) }
  if (path === '/api/message/readAll') { store.messages.forEach(function(m) { m.isRead = true }); persist('messages'); return ok(store.messages) }
  if (path === '/api/favorite/toggle') return toggleFavorite(data.sku)
  if (path === '/api/footprint/record') { recordFootprint(data.sku); return ok(null) }
  if (path === '/api/footprint/remove') return removeFootprint(data.sku)
  if (path === '/api/footprint/clear') return clearFootprints()
  if (path === '/api/groupbuy/join') return joinGroupbuy(data.id)

  // ---- 旧版接口兜底（兼容 /api/data/xxx.json 与 /data/xxx.json）----
  if (/data\/data\.json$/.test(path)) return legacyHome()
  if (/data\/detail\.json$/.test(path)) return legacyDetail()
  if (/data\/orders\.json$/.test(path)) return legacyOrders()
  if (/data\/me\.json$/.test(path)) return ok(store.me)
  if (/data\/vip\.json$/.test(path)) return ok([{ data: store.vip.privileges }, { data: store.vip.redbags }, { data: store.vip.products }])
  if (/data\/searchMsg\.json$/.test(path)) return ok({ data: store.hotWords, like_result: { product_list: store.goods.slice(0, 8) } })

  return fail('接口不存在: ' + path)
}

// ---------- 业务查询 ----------
function detail(sku) {
  var g = findGoods(sku)
  if (!g) return fail('商品不存在')
  var all = store.reviews.concat(store.userReviews).filter(function(r) { return r.goodsId === sku })
  var d = clone(g)
  d.reviews = all
  d.isCollect = store.favorites.indexOf(sku) >= 0
  return ok(d)
}
function goodsList(data) {
  var list = store.goods.slice()
  if (data.category) list = list.filter(function(g) { return g.categoryName === data.category })
  if (data.q) {
    var q = (data.q || '').toLowerCase()
    list = list.filter(function(g) { return g.name.toLowerCase().indexOf(q) >= 0 || g.subtitle.toLowerCase().indexOf(q) >= 0 })
  }
  if (data.sort === 'price_asc') list.sort(function(a, b) { return a.price - b.price })
  else if (data.sort === 'price_desc') list.sort(function(a, b) { return b.price - a.price })
  else list.sort(function(a, b) { return b.sells - a.sells })
  return ok(paginate(list, data.page, data.size || 10))
}
function suggest(kw) {
  kw = (kw || '').trim().toLowerCase()
  if (!kw) return ok([])
  var list = store.goods.filter(function(g) { return g.name.toLowerCase().indexOf(kw) === 0 || g.name.toLowerCase().indexOf(kw) >= 0 }).slice(0, 8)
  return ok(list)
}
function searchResults(data) {
  var q = (data.q || '').trim().toLowerCase()
  var list = store.goods.filter(function(g) { return g.name.toLowerCase().indexOf(q) >= 0 || g.subtitle.toLowerCase().indexOf(q) >= 0 })
  if (data.sort === 'price_asc') list.sort(function(a, b) { return a.price - b.price })
  else if (data.sort === 'price_desc') list.sort(function(a, b) { return b.price - a.price })
  else list.sort(function(a, b) { return b.sells - a.sells })
  return ok(paginate(list, data.page, 10))
}
function ordersList(data) {
  var list = store.orders.slice()
  if (data.status && data.status !== '0') list = list.filter(function(o) { return o.status === Number(data.status) })
  list.sort(function(a, b) { return a.createTime < b.createTime ? 1 : -1 })
  return ok(paginate(list, data.page, data.size || 10))
}
function orderDetail(id) {
  var o = findOrder(id)
  if (!o) return fail('订单不存在')
  return ok(o)
}
function myCoupons(status) {
  var list = store.coupons.slice()
  if (status && status !== '0') list = list.filter(function(c) { return c.status === Number(status) })
  return ok(list)
}
function favorites() {
  var list = store.favorites.map(function(sku) { return findGoods(sku) }).filter(Boolean)
  return ok(list)
}
function footprints() {
  var list = store.footprints.map(function(f) {
    var g = findGoods(f.sku); return g ? Object.assign({}, g, { visitTime: f.time }) : null
  }).filter(Boolean)
  return ok(list)
}
function cartUpdate(data) {
  var it = store.cart.find(function(x) { return x.id === data.id })
  if (!it) return fail('购物车项不存在')
  var g = findGoods(it.sku)
  if (data.count !== undefined) it.count = Math.max(1, Math.min(Number(data.count), g.stock))
  if (data.checked !== undefined) it.checked = !!data.checked
  persist('cart')
  return ok(enrichCart())
}
function cartRemove(id) {
  store.cart = store.cart.filter(function(x) { return x.id !== id })
  persist('cart')
  return ok(enrichCart())
}
function cartCheckAll(checked) {
  store.cart.forEach(function(it) { it.checked = !!checked })
  persist('cart')
  return ok(enrichCart())
}

// ---------- 旧版兜底数据 ----------
function legacyHome() {
  return ok({
    banner: store.banners,
    categoryAreaV2: { lanternArea: store.navArea, tileArea: store.navArea },
    products: store.goods.map(function(g) {
      return { image: g.pic, name: g.name, subtitle: g.subtitle, sku: g.sku, stock: g.stock, unit: g.unit,
        cart_image: g.pic, nationwide: 0, sell_out: g.stock <= 0, type: 'product',
        product_tags: g.tags.map(function(t) { return { name: t } }),
        non_vip_price_pro: { price_up: { price: g.originalPrice }, price_down: { price: g.price } },
        vip_price_pro: { price_up: { price: g.originalPrice }, price_down: { price: g.vipPrice } } }
    })
  })
}
function legacyDetail() {
  var g = store.goods[0]
  return ok({ name: g.name, subtitle: g.subtitle, price: g.price, vip_price: g.vipPrice,
    images: g.pics, country: g.origin, delivery_style: '冷链配送 · 当日达', stock: g.stock,
    sku: g.sku, unit: g.unit, market_price: g.originalPrice, sales_volume: g.sells + '份',
    weight: g.unit, pack: '精美包装', storage_time: '详见包装', storage_method: '冷藏0-4℃',
    instruction: g.detailImages.map(function(im) { return { image: im } }),
    description: [g.description], promotion: g.tags, securityTitle: '优鲜安心检测', securityText: '100%第三方权威检测' })
}
function legacyOrders() {
  return ok(store.orders.map(function(o) {
    return { icon: o.items[0].pic, title: o.items[0].name, price: F.fenToYuan(o.payAmount), orderNo: o.orderNo, status: o.status, id: o.id }
  }))
}

// ---------- 请求入口（被 app.js 的 wx.request 拦截器调用） ----------
function handleRequest(options) {
  var url = options.url || ''
  var method = (options.method || 'GET').toUpperCase()
  var qidx = url.indexOf('?')
  var path = qidx >= 0 ? url.slice(0, qidx) : url
  // 去掉协议/主机前缀；保留 /api 前缀（路由检查中使用）
  path = path.replace(/^https?:\/\/localhost:3001/, '').replace(/^https?:\/\/127\.0\.0\.1:3001/, '')
  var query = {}
  if (qidx >= 0) {
    var pairs = url.slice(qidx + 1).split('&')
    pairs.forEach(function(p) {
      if (!p) return
      var kv = p.split('=')
      query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '')
    })
  }
  var data = Object.assign({}, query, options.data || {})
  return delay().then(function() {
    var res
    try { res = route(method, path, data) } catch (e) { res = fail('服务器异常: ' + e.message) }
    var body = res
    if (options.success) options.success({ data: body, statusCode: 200, errMsg: 'request:ok' })
    if (options.complete) options.complete({ errMsg: 'request:ok' })
    return body
  })
}

module.exports = { handleRequest: handleRequest, store: store, seed: seed }
