// mock/store.js —— 内存数据库 + storage 持久化；所有接口 200~600ms 随机延迟
// 金额一律使用「分」（整数），页面层通过 utils/format.js 转换为元

var seed = require('./seed.js')

var DB_KEY = 'fl_db_v1'
var db = null

function loadDB() {
  if (db) return db
  try {
    var cached = wx.getStorageSync(DB_KEY)
    if (cached && cached.goods) {
      db = cached
      return db
    }
  } catch (e) {}
  db = seed.buildSeed()
  saveDB()
  return db
}

function saveDB() {
  try { wx.setStorageSync(DB_KEY, db) } catch (e) {}
}

// 随机延迟 200~600ms
function delay() {
  var ms = 200 + Math.floor(Math.random() * 400)
  return new Promise(function (resolve) { setTimeout(resolve, ms) })
}

function ok(data) { return delay().then(function () { return data }) }

// ---------------- 商品 / 分类 / 首页 ----------------
function getHomeData() {
  var d = loadDB()
  return ok({
    banners: d.banners,
    lanternArea: d.lanternArea,
    tileArea: d.tileArea,
    goods: d.goods,
    hotWords: d.hotWords
  })
}

function getCategories() {
  var d = loadDB()
  var list = d.categories.map(function (c) {
    var count = d.goods.filter(function (g) { return g.categoryId === c.id }).length
    return { id: c.id, name: c.name, icon: c.icon, count: count }
  })
  return ok(list)
}

function getProducts(query) {
  var d = loadDB()
  query = query || {}
  var list = d.goods.slice()
  if (query.categoryId) list = list.filter(function (g) { return g.categoryId === query.categoryId })
  if (query.keyword) {
    var kw = query.keyword.toLowerCase()
    list = list.filter(function (g) {
      return g.name.toLowerCase().indexOf(kw) >= 0 || g.subtitle.toLowerCase().indexOf(kw) >= 0 || g.categoryName.indexOf(kw) >= 0
    })
  }
  if (query.sort === 'priceAsc') list.sort(function (a, b) { return a.price - b.price })
  else if (query.sort === 'priceDesc') list.sort(function (a, b) { return b.price - a.price })
  else if (query.sort === 'sales') list.sort(function (a, b) { return b.numberSells - a.numberSells })
  else list.sort(function (a, b) { return b.hotScore - a.hotScore })
  var page = query.page || 1
  var pageSize = query.pageSize || 10
  var total = list.length
  var start = (page - 1) * pageSize
  return ok({ list: list.slice(start, start + pageSize), total: total, page: page, pageSize: pageSize })
}

function getProductDetail(id) {
  var d = loadDB()
  var g = d.goods.filter(function (x) { return x.id === id || x.sku === id })[0]
  if (!g) return ok(null)
  var reviews = d.reviews.filter(function (r) { return r.goodsId === g.id })
  var recommend = d.goods.filter(function (x) { return x.categoryId === g.categoryId && x.id !== g.id }).slice(0, 6)
  var isCollect = d.favorites.some(function (f) { return f.goodsId === g.id })
  return ok({ product: g, reviews: reviews, recommend: recommend, isCollect: isCollect })
}

// ---------------- 搜索 ----------------
function getSearchInit() {
  var d = loadDB()
  return ok({ hotWords: d.hotWords, history: d.history, products: d.goods.slice(0, 10) })
}
function saveHistory(word) {
  var d = loadDB()
  d.history = d.history.filter(function (w) { return w !== word })
  d.history.unshift(word)
  d.history = d.history.slice(0, 10)
  saveDB()
  return ok(d.history)
}
function clearHistory() {
  var d = loadDB()
  d.history = []
  saveDB()
  return ok([])
}
function removeHistoryWord(word) {
  var d = loadDB()
  d.history = d.history.filter(function (w) { return w !== word })
  saveDB()
  return ok(d.history)
}

// ---------------- 购物车 ----------------
function getCart() {
  var d = loadDB()
  // 同步库存与失效状态
  var items = d.cart.map(function (it) {
    var g = d.goods.filter(function (x) { return x.id === it.goodsId })[0]
    var stock = g ? g.stock : 0
    return Object.assign({}, it, { stock: stock, invalid: !g || stock <= 0, pic: g ? g.pic : it.pic, name: g ? g.name : it.name })
  })
  return ok(items)
}

function addToCart(goodsId, specLabel, count, opts) {
  var d = loadDB()
  var g = d.goods.filter(function (x) { return x.id === goodsId })[0]
  if (!g) return ok({ success: false, msg: '商品不存在' })
  count = count || 1
  var specText = (opts && opts.specText) || specLabel || '标准装 · 常规包装'
  var price = g.price
  if (specLabel && specLabel.indexOf('精选') >= 0) price = g.price + 300
  if (specLabel && specLabel.indexOf('礼盒') >= 0) price = g.price + 800
  if (specLabel && specLabel.indexOf('保鲜') >= 0) price += 500
  if (opts && opts.priceOverride) price = opts.priceOverride // 秒杀价等自定义价格
  var existing = d.cart.filter(function (it) { return it.goodsId === goodsId && it.specText === specText })[0]
  if (existing) {
    existing.count = Math.min(existing.count + count, g.stock)
    existing.checked = true
  } else {
    d.cart.push({
      id: 'ci' + (d.cart.length + 1) + '_' + goodsId,
      goodsId: goodsId, name: g.name, pic: g.pic, specText: specText,
      price: price, count: Math.min(count, g.stock), checked: true, stock: g.stock, invalid: false
    })
  }
  saveDB()
  return ok({ success: true, cartCount: cartCount() })
}

function updateCartItem(cartItemId, patch) {
  var d = loadDB()
  var it = d.cart.filter(function (x) { return x.id === cartItemId })[0]
  if (!it) return ok({ success: false })
  if (patch.count !== undefined) {
    var g = d.goods.filter(function (x) { return x.id === it.goodsId })[0]
    var max = g ? g.stock : 0
    it.count = Math.max(0, Math.min(patch.count, max))
  }
  if (patch.checked !== undefined) it.checked = patch.checked
  saveDB()
  return ok({ success: true })
}

function removeCartItem(cartItemId) {
  var d = loadDB()
  d.cart = d.cart.filter(function (x) { return x.id !== cartItemId })
  saveDB()
  return ok({ success: true })
}

function clearCheckedItems() {
  var d = loadDB()
  d.cart = d.cart.filter(function (it) { return !it.checked || it.invalid })
  saveDB()
  return ok({ success: true })
}

function clearInvalid() {
  var d = loadDB()
  d.cart = d.cart.filter(function (it) { return !it.invalid })
  saveDB()
  return ok({ success: true })
}

function cartCount() {
  var d = loadDB()
  return d.cart.reduce(function (s, it) { return s + it.count }, 0)
}

// ---------------- 地址 ----------------
function getAddresses() { return ok(loadDB().addresses.slice()) }
function getAddress(id) {
  var d = loadDB()
  return ok(d.addresses.filter(function (a) { return a.id === id })[0] || null)
}
function saveAddress(data) {
  var d = loadDB()
  if (data.id) {
    var a = d.addresses.filter(function (x) { return x.id === data.id })[0]
    if (a) Object.assign(a, data)
  } else {
    data.id = 'a' + (d.addresses.length + 1) + '_' + Math.floor(Math.random() * 1000)
    data.isDefault = d.addresses.length === 0
    d.addresses.push(data)
  }
  if (data.isDefault) d.addresses.forEach(function (x) { x.isDefault = x.id === data.id })
  saveDB()
  return ok({ success: true, addresses: d.addresses })
}
function deleteAddress(id) {
  var d = loadDB()
  d.addresses = d.addresses.filter(function (x) { return x.id !== id })
  saveDB()
  return ok({ success: true, addresses: d.addresses })
}
function setDefaultAddress(id) {
  var d = loadDB()
  d.addresses.forEach(function (x) { x.isDefault = x.id === id })
  saveDB()
  return ok({ success: true, addresses: d.addresses })
}

// ---------------- 优惠券 ----------------
function getCouponCenter() { return ok(loadDB().couponCenter.slice()) }
function getMyCoupons(status) {
  var d = loadDB()
  var list = d.myCoupons.slice()
  if (status) list = list.filter(function (c) { return c.status === status })
  return ok(list)
}
function claimCoupon(id) {
  var d = loadDB()
  var c = d.couponCenter.filter(function (x) { return x.id === id })[0]
  if (!c) return ok({ success: false, msg: '优惠券不存在' })
  if (d.myCoupons.some(function (m) { return m.source === '领取' && m.name === c.name && m.status === 1 })) {
    return ok({ success: false, msg: '您已领取过该券' })
  }
  d.myCoupons.push({
    id: 'mc_' + id + '_' + Date.now(), name: c.name, type: c.type, threshold: c.threshold,
    discount: c.discount, scope: c.scope, status: 1, expireTime: c.expireTime, source: '领取'
  })
  c.remain = Math.max(0, c.remain - 1)
  pushMessage(d, 3, '领券成功', '您已领取「' + c.name + '」，有效期至 ' + c.expireTime + '，下单时可用。', '')
  saveDB()
  return ok({ success: true, msg: '领取成功' })
}

// ---------------- 订单 ----------------
function getOrders(query) {
  var d = loadDB()
  query = query || {}
  var list = d.orders.slice().sort(function (a, b) { return b.createTime.localeCompare(a.createTime) })
  if (query.status) list = list.filter(function (o) { return o.status === query.status })
  var page = query.page || 1, pageSize = query.pageSize || 10
  var total = list.length
  var start = (page - 1) * pageSize
  return ok({ list: list.slice(start, start + pageSize), total: total, page: page, pageSize: pageSize })
}
function getOrderDetail(id) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === id || x.orderNo === id })[0]
  return ok(o || null)
}

// 满减阶梯（需求9：先满减后用券，自动按最高可享阶梯减免）
function fullReduceOf(goodsTotal) {
  var tiers = [ { threshold: 19900, reduce: 5000 }, { threshold: 9900, reduce: 2000 }, { threshold: 5900, reduce: 800 } ]
  for (var i = 0; i < tiers.length; i++) {
    if (goodsTotal >= tiers[i].threshold) return tiers[i].reduce
  }
  return 0
}

function createOrder(payload) {
  var d = loadDB()
  var items = payload.items || []
  if (!items.length) return ok({ success: false, msg: '订单商品为空' })
  var goodsTotal = items.reduce(function (s, it) { return s + it.price * it.count }, 0)
  // 满减优惠（先满减）
  var fullReduce = fullReduceOf(goodsTotal)
  // 优惠券优惠（后用券）
  var coupon = null
  var couponDiscount = 0
  if (payload.couponId) {
    coupon = d.myCoupons.filter(function (c) { return c.id === payload.couponId && c.status === 1 })[0]
    if (coupon) {
      if (coupon.type === 1 || coupon.type === 3) couponDiscount = coupon.discount
      else if (coupon.type === 2) couponDiscount = Math.round(goodsTotal * coupon.discount / 100)
    }
  }
  var member = d.member
  var freeThreshold = member.level >= 2 ? 3900 : 5900
  var afterDiscount = goodsTotal - fullReduce - couponDiscount
  var freight = afterDiscount >= freeThreshold ? 0 : 600
  var payAmount = Math.max(0, afterDiscount + freight)
  var orderNo = 'FL' + new Date().getFullYear() + ('0' + (new Date().getMonth() + 1)).slice(-2) + ('0' + new Date().getDate()).slice(-2) + String(Math.floor(Math.random() * 100000)).padStart(5, '0')
  var order = {
    id: 'o' + (d.orders.length + 1) + '_' + Math.floor(Math.random() * 10000),
    orderNo: orderNo,
    status: payload.payType === 2 ? 1 : 2, // 货到付款→待付款；微信支付→待发货
    items: items,
    totalAmount: goodsTotal,
    fullReduceAmount: fullReduce,
    couponDiscount: couponDiscount,
    discountAmount: fullReduce + couponDiscount,
    freight: freight,
    payAmount: payAmount,
    couponId: coupon ? coupon.id : null,
    couponTitle: coupon ? coupon.name : '',
    payType: payload.payType || 1,
    payTypeName: payload.payType === 2 ? '货到付款' : '微信支付',
    remark: payload.remark || '',
    deliveryDate: payload.deliverySlot || '尽快送达（预计45分钟）',
    deliverySlot: payload.deliverySlot || '尽快送达（预计45分钟）',
    addressSnapshot: payload.addressSnapshot,
    rider: payload.payType === 1 ? { name: '李师傅', phone: '13900139000' } : null,
    isReviewed: false,
    createTime: formatNow(),
    timeline: []
  }
  // 时间线
  order.timeline = [{ time: formatNow(), status: '下单成功', remark: '订单已提交，等待支付' }]
  if (payload.payType === 1) {
    order.timeline.push({ time: formatNow(), status: '支付成功', remark: '微信支付 ' + (payAmount / 100).toFixed(2) + ' 元（演示环境，不产生真实交易）' })
    order.timeline.push({ time: formatNow(), status: '商家分拣', remark: '商品正在分拣打包' })
  }
  d.orders.unshift(order)
  // 使用优惠券
  if (coupon) { coupon.status = 2; coupon.usedTime = formatNow() }
  // 清空已结算购物车
  d.cart = d.cart.filter(function (it) { return !it.checked || it.invalid })
  // 购物积分（按商品总价）
  var pts = Math.round(goodsTotal / 100)
  d.pointsRecords.unshift({ id: 'pt' + Date.now(), type: 1, points: pts, desc: '购物消费 实付' + (payAmount / 100).toFixed(2) + '元', createTime: formatNow() })
  d.member.points += pts
  // 订单消息
  pushMessage(d, 2, '下单成功', '订单 ' + orderNo + ' 已提交，商品总价 ¥' + (goodsTotal / 100).toFixed(2) + '，应付 ¥' + (payAmount / 100).toFixed(2) + '。', order.id)
  if (payload.payType === 1) {
    pushMessage(d, 2, '支付成功', '订单 ' + orderNo + ' 微信支付 ¥' + (payAmount / 100).toFixed(2) + '（演示环境，不产生真实交易），商家正在备货。', order.id)
  }
  saveDB()
  return ok({ success: true, order: order })
}

function cancelOrder(id) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === id })[0]
  if (!o) return ok({ success: false, msg: '订单不存在' })
  if (o.status !== 1) return ok({ success: false, msg: '仅待付款订单可取消' })
  o.status = 6
  o.timeline = [{ time: formatNow(), status: '订单已取消', remark: '用户取消订单，退款将原路返回（演示）' }]
  if (o.couponId) {
    var c = d.myCoupons.filter(function (x) { return x.id === o.couponId })[0]
    if (c) { c.status = 1; delete c.usedTime }
  }
  pushMessage(d, 2, '订单已取消', '订单 ' + o.orderNo + ' 已取消，退款将原路返回（演示环境，不产生真实交易）。', o.id)
  saveDB()
  return ok({ success: true, order: o })
}

function payOrder(id) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === id })[0]
  if (!o) return ok({ success: false, msg: '订单不存在' })
  if (o.status !== 1) return ok({ success: false, msg: '当前状态不可支付' })
  o.status = 2
  o.rider = { name: '李师傅', phone: '13900139000' }
  o.timeline.push({ time: formatNow(), status: '支付成功', remark: '微信支付 ' + (o.payAmount / 100).toFixed(2) + ' 元（演示环境，不产生真实交易）' })
  o.timeline.push({ time: formatNow(), status: '商家分拣', remark: '商品正在分拣打包' })
  pushMessage(d, 2, '支付成功', '订单 ' + o.orderNo + ' 支付 ¥' + (o.payAmount / 100).toFixed(2) + '（演示环境，不产生真实交易），商家正在备货。', o.id)
  saveDB()
  return ok({ success: true, order: o })
}

function confirmReceive(id) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === id })[0]
  if (!o) return ok({ success: false, msg: '订单不存在' })
  if (o.status !== 4) return ok({ success: false, msg: '仅待收货订单可确认' })
  o.status = 5
  o.timeline.push({ time: formatNow(), status: '送达完成', remark: '订单已完成，感谢惠顾，期待您的评价' })
  pushMessage(d, 2, '订单已送达', '订单 ' + o.orderNo + ' 已送达完成，感谢惠顾！完成评价可获20积分。', o.id)
  saveDB()
  return ok({ success: true, order: o })
}

// ---------------- 评价 ----------------
function submitReview(payload) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === payload.orderId })[0]
  if (!o) return ok({ success: false, msg: '订单不存在' })
  payload.items.forEach(function (it) {
    d.reviews.push({
      id: 'r' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      orderId: payload.orderId, goodsId: it.goodsId, userId: 'u1001',
      userName: d.member.nickName, avatar: d.member.avatar,
      score: it.score, tags: it.tags || [], content: it.content || '', images: it.images || [],
      createTime: formatNow()
    })
  })
  o.isReviewed = true
  d.member.points += 20
  d.pointsRecords.unshift({ id: 'pt' + Date.now(), type: 3, points: 20, desc: '商品评价', createTime: formatNow() })
  saveDB()
  return ok({ success: true, msg: '评价成功，获得20积分' })
}

// ---------------- 会员 / 积分 / 签到 ----------------
function getMember() { return ok(loadDB().member) }
// 7天梯度奖励：+5/+5/+10/+10/+15/+20/+50，第8天起循环回+5
var CHECKIN_REWARDS = [5, 5, 10, 10, 15, 20, 50]
function checkIn() {
  var d = loadDB()
  var today = formatNow().slice(0, 10)
  if (d.member.checkIn.lastDate === today) return ok({ success: false, msg: '今日已签到，明天再来吧' })
  d.member.checkIn.lastDate = today
  d.member.checkIn.consecutive += 1
  d.member.checkIn.monthRecords = d.member.checkIn.monthRecords || []
  if (d.member.checkIn.monthRecords.indexOf(today) < 0) d.member.checkIn.monthRecords.push(today)
  var reward = CHECKIN_REWARDS[(d.member.checkIn.consecutive - 1) % 7]
  d.member.points += reward
  d.pointsRecords.unshift({ id: 'pt' + Date.now(), type: 2, points: reward, desc: '每日签到（连续' + d.member.checkIn.consecutive + '天）', createTime: formatNow() })
  pushMessage(d, 1, '签到成功', '今日签到 +' + reward + ' 积分，连续签到' + d.member.checkIn.consecutive + '天，继续加油！', '')
  saveDB()
  return ok({ success: true, msg: '签到成功，+' + reward + '积分', points: d.member.points, consecutive: d.member.checkIn.consecutive, reward: reward })
}
function getPointsRecords() { return ok(loadDB().pointsRecords.slice()) }
function exchangeGood(goodId) {
  var d = loadDB()
  var gifts = {
    'ex1': { points: 100, name: '5元无门槛券', coupon: { id: 'c4', name: '新人无门槛5元', type: 3, threshold: 0, discount: 500, scope: '全场', expireTime: '2026-12-31 23:59' } },
    'ex2': { points: 300, name: '水果叉套装', coupon: null },
    'ex3': { points: 500, name: '30元满99可用券', coupon: { id: 'c3', name: '满99减20元', type: 1, threshold: 9900, discount: 2000, scope: '全场', expireTime: '2026-12-31 23:59' } },
    'ex4': { points: 880, name: '当季水果3斤装', coupon: null }
  }
  var g = gifts[goodId]
  if (!g) return ok({ success: false, msg: '兑换商品不存在' })
  if (d.member.points < g.points) return ok({ success: false, msg: '积分不足' })
  d.member.points -= g.points
  d.pointsRecords.unshift({ id: 'pt' + Date.now(), type: 4, points: -g.points, desc: '兑换' + g.name, createTime: formatNow() })
  if (g.coupon) {
    d.myCoupons.push({ id: 'mc_ex_' + Date.now(), name: g.coupon.name, type: g.coupon.type, threshold: g.coupon.threshold, discount: g.coupon.discount, scope: g.coupon.scope, status: 1, expireTime: g.coupon.expireTime, source: '积分兑换' })
  }
  pushMessage(d, 1, '积分兑换成功', '已消耗' + g.points + '积分兑换「' + g.name + '」，' + (g.coupon ? '优惠券已放入我的优惠券。' : '实物好礼将尽快寄出。'), '')
  saveDB()
  return ok({ success: true, msg: '兑换成功：' + g.name, points: d.member.points })
}

// ---------------- 消息 ----------------
// 统一消息生成助手：所有状态流转/营销动作都走这里，保证消息可追溯
function pushMessage(d, type, title, content, relatedId) {
  d.messages.unshift({
    id: 'm' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    type: type, title: title, content: content, isRead: false,
    createTime: formatNow(), relatedId: relatedId || ''
  })
  d.messages = d.messages.slice(0, 50)
}

function getMessages() { return ok(loadDB().messages.slice().sort(function (a, b) { return b.createTime.localeCompare(a.createTime) })) }
function markRead(id) {
  var d = loadDB()
  var m = d.messages.filter(function (x) { return x.id === id })[0]
  if (m) m.isRead = true
  saveDB()
  return ok({ success: true })
}
function markAllRead() {
  var d = loadDB()
  d.messages.forEach(function (m) { m.isRead = true })
  saveDB()
  return ok({ success: true })
}
function getUnreadCount() {
  return ok(loadDB().messages.filter(function (m) { return !m.isRead }).length)
}
// 促销延迟推送（消息中心进入3秒后触发）
function pushDelayedSeckillMessage() {
  var d = loadDB()
  // 避免重复推送
  if (d.messages.some(function (m) { return m.title.indexOf('20:00') >= 0 && m.type === 3 })) return ok({ success: true, already: true })
  pushMessage(d, 3, '限时抢购20:00场即将开始', '20:00场限时抢购即将开始，车厘子秒杀价低至19.9元，先到先得！', 'promotion?tab=seckill')
  saveDB()
  return ok({ success: true })
}

// ---------------- 订单状态推进（需求7：催发货/模拟配送进度） ----------------
// 2待发货 → 3配送中（商家已发货+骑手取货）→ 4待收货 → 5已完成（送达）
function advanceOrder(id) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === id })[0]
  if (!o) return ok({ success: false, msg: '订单不存在' })
  var now = formatNow()
  if (o.status === 2) {
    o.status = 3
    o.rider = { name: '李师傅', phone: '13900139000' }
    o.timeline.push({ time: now, status: '商家已发货', remark: '商品已发出，正在运往配送站' })
    o.timeline.push({ time: now, status: '骑手已取货', remark: '骑手李师傅已取货，正在配送' })
    pushMessage(d, 2, '商家已发货', '订单 ' + o.orderNo + ' 已发货，骑手李师傅（13900139000）正在为您配送。', o.id)
  } else if (o.status === 3) {
    o.status = 4
    o.timeline.push({ time: now, status: '骑手配送中', remark: '即将送达，请保持电话畅通' })
    pushMessage(d, 2, '订单配送中', '订单 ' + o.orderNo + ' 正在配送，预计45分钟内送达。', o.id)
  } else if (o.status === 4) {
    o.status = 5
    o.timeline.push({ time: now, status: '送达完成', remark: '订单已完成，感谢惠顾，期待您的评价' })
    pushMessage(d, 2, '订单已送达', '订单 ' + o.orderNo + ' 已送达，感谢惠顾！完成评价可获20积分。', o.id)
  } else {
    return ok({ success: false, msg: '当前状态无法推进（' + o.statusName || '订单已完成/已取消）' })
  }
  saveDB()
  return ok({ success: true, order: o })
}

// ---------------- 售后退款（需求7.3） ----------------
function requestRefund(id, reason) {
  var d = loadDB()
  var o = d.orders.filter(function (x) { return x.id === id })[0]
  if (!o) return ok({ success: false, msg: '订单不存在' })
  if (o.status !== 5) return ok({ success: false, msg: '仅已完成订单可申请退款' })
  o.status = 7 // 退款成功
  o.refund = { reason: reason || '不新鲜', amount: o.payAmount, time: formatNow(), status: '退款成功' }
  o.timeline.push({ time: formatNow(), status: '退款成功', remark: '退款原因：' + (reason || '不新鲜') + '，金额 ' + (o.payAmount / 100).toFixed(2) + ' 元原路退回（演示）' })
  pushMessage(d, 2, '退款成功', '订单 ' + o.orderNo + ' 退款 ' + (o.payAmount / 100).toFixed(2) + ' 元已原路退回（演示环境，不产生真实交易）。', o.id)
  saveDB()
  return ok({ success: true, order: o })
}

// ---------------- 收藏 / 足迹 ----------------
function getFavorites() {
  var d = loadDB()
  var list = d.favorites.map(function (f) {
    var g = d.goods.filter(function (x) { return x.id === f.goodsId })[0]
    return g ? Object.assign({}, g, { isCollect: true }) : null
  }).filter(Boolean)
  return ok(list)
}
function toggleFavorite(goodsId) {
  var d = loadDB()
  var idx = d.favorites.findIndex(function (f) { return f.goodsId === goodsId })
  if (idx >= 0) { d.favorites.splice(idx, 1); saveDB(); return ok({ isCollect: false, success: true }) }
  d.favorites.push({ goodsId: goodsId, createTime: formatNow() })
  saveDB()
  return ok({ isCollect: true, success: true })
}
function getFootprints() {
  var d = loadDB()
  var list = d.footprints.map(function (f) {
    var g = d.goods.filter(function (x) { return x.id === f.goodsId })[0]
    return g ? Object.assign({}, g, { viewTime: f.time }) : null
  }).filter(Boolean)
  return ok(list)
}
function addFootprint(goodsId) {
  var d = loadDB()
  d.footprints = d.footprints.filter(function (f) { return f.goodsId !== goodsId })
  d.footprints.unshift({ goodsId: goodsId, time: formatNow() })
  d.footprints = d.footprints.slice(0, 30)
  saveDB()
  return ok({ success: true })
}
function deleteFootprint(goodsId) {
  var d = loadDB()
  d.footprints = d.footprints.filter(function (f) { return f.goodsId !== goodsId })
  saveDB()
  return ok({ success: true })
}
function clearFootprints() {
  var d = loadDB()
  d.footprints = []
  saveDB()
  return ok({ success: true })
}

// ---------------- VIP ----------------
function getVipData() { return ok(loadDB().vip) }
function claimRedPacket(id) {
  var d = loadDB()
  var rb = d.vip.data[1].data.filter(function (x) { return x.id === id })[0]
  if (!rb) return ok({ success: false, msg: '红包不存在' })
  if (rb.got) return ok({ success: false, msg: '已领取过' })
  rb.got = true
  var disc = rb.name.indexOf('5') >= 0 ? 500 : rb.name.indexOf('8') >= 0 ? 800 : 600
  d.myCoupons.push({ id: 'mc_rb_' + Date.now(), name: rb.name, type: 3, threshold: 0, discount: disc, scope: '全场', status: 1, expireTime: '2026-12-31 23:59', source: '会员红包' })
  pushMessage(d, 3, '会员红包领取成功', '「' + rb.name + '」已放入我的优惠券，全场通用无门槛。', '')
  saveDB()
  return ok({ success: true, msg: '领取成功，已放入我的优惠券' })
}

// ---------------- 促销 ----------------
function getPromotions() { return ok(loadDB().promotions) }

// ---------------- 工具 ----------------
function formatNow() {
  var d = new Date()
  function p(x) { return x < 10 ? '0' + x : x }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

module.exports = {
  loadDB: loadDB, saveDB: saveDB, delay: delay,
  getHomeData: getHomeData, getCategories: getCategories, getProducts: getProducts, getProductDetail: getProductDetail,
  getSearchInit: getSearchInit, saveHistory: saveHistory, clearHistory: clearHistory, removeHistoryWord: removeHistoryWord,
  getCart: getCart, addToCart: addToCart, updateCartItem: updateCartItem, removeCartItem: removeCartItem,
  clearCheckedItems: clearCheckedItems, clearInvalid: clearInvalid, cartCount: cartCount,
  getAddresses: getAddresses, getAddress: getAddress, saveAddress: saveAddress, deleteAddress: deleteAddress, setDefaultAddress: setDefaultAddress,
  getCouponCenter: getCouponCenter, getMyCoupons: getMyCoupons, claimCoupon: claimCoupon,
  getOrders: getOrders, getOrderDetail: getOrderDetail, createOrder: createOrder, cancelOrder: cancelOrder, payOrder: payOrder, confirmReceive: confirmReceive,
  advanceOrder: advanceOrder, requestRefund: requestRefund,
  submitReview: submitReview,
  getMember: getMember, checkIn: checkIn, getPointsRecords: getPointsRecords, exchangeGood: exchangeGood,
  getMessages: getMessages, markRead: markRead, markAllRead: markAllRead, getUnreadCount: getUnreadCount, pushDelayedSeckillMessage: pushDelayedSeckillMessage,
  getFavorites: getFavorites, toggleFavorite: toggleFavorite, getFootprints: getFootprints, addFootprint: addFootprint, deleteFootprint: deleteFootprint, clearFootprints: clearFootprints,
  getVipData: getVipData, claimRedPacket: claimRedPacket, getPromotions: getPromotions, fullReduceOf: fullReduceOf,
  CHECKIN_REWARDS: CHECKIN_REWARDS
}
