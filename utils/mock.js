// utils/mock.js —— wx.request 拦截器：本地内存数据库，200~600ms 随机延迟
// 所有 /api/ 开头的请求在此处理，其余请求放行原始 wx.request

var db = require('./db.js')
var fmt = require('./format.js')
db.hydrate()

var originalRequest = wx.request

function ok(data, msg) {
  return { errno: 0, msg: msg || 'ok', data: data }
}
function fail(msg) {
  return { errno: 1, msg: msg || '操作失败', data: null }
}

function delay(cb) {
  var ms = 200 + Math.floor(Math.random() * 400)
  setTimeout(cb, ms)
}

// ===== 工具 =====
function paginate(list, page, pageSize) {
  page = page || 1
  pageSize = pageSize || 10
  var start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    hasMore: start + pageSize < list.length,
    page: page
  }
}

function mergeCartItem(ci) {
  var g = db.getGoods(ci.goodsId)
  return {
    id: ci.id,
    goodsId: ci.goodsId,
    sku: ci.sku,
    name: ci.name,
    pic: ci.pic,
    specText: ci.specText,
    price: ci.price,
    priceYuan: fmt.yuan(ci.price),
    count: ci.count,
    checked: ci.checked,
    stock: ci.stock,
    invalid: ci.invalid || !g || g.stock <= 0 || ci.count > g.stock,
    subtotal: ci.price * ci.count,
    subtotalYuan: fmt.yuan(ci.price * ci.count)
  }
}

// ===== 路由处理器 =====
var routes = {

  // ---------- 分类（含商品数量）----------
  'GET /api/categories': function () {
    var list = db.CATEGORIES.map(function (c) {
      var count = db.GOODS.filter(function (g) { return g.categoryId === c.id }).length
      return Object.assign({}, c, { count: count })
    })
    return ok({ list: list })
  },

  // ---------- 首页 ----------
  'GET /api/home': function () {
    return ok({
      banner: db.BANNERS,
      lanterns: db.LANTERNS,
      goods: db.GOODS,
      hotGoods: db.GOODS.filter(function (g) { return g.hot }).slice(0, 6)
    })
  },

  // ---------- 商品列表（分类/搜索/排序/价格区间/有货/优惠/标签/分页）----------
  'GET /api/goods/list': function (q) {
    var list = db.GOODS.slice()
    if (q.categoryId) {
      list = list.filter(function (g) { return g.categoryId === Number(q.categoryId) })
    }
    if (q.keyword) {
      var kw = String(q.keyword).toLowerCase()
      list = list.filter(function (g) {
        return g.name.toLowerCase().indexOf(kw) >= 0 || g.subtitle.toLowerCase().indexOf(kw) >= 0 || g.categoryName.indexOf(kw) >= 0
      })
    }
    // 价格区间（单位：分，支持单边）
    if (q.minPrice !== undefined && q.minPrice !== '' && !isNaN(Number(q.minPrice))) {
      list = list.filter(function (g) { return g.minPrice >= Number(q.minPrice) })
    }
    if (q.maxPrice !== undefined && q.maxPrice !== '' && !isNaN(Number(q.maxPrice))) {
      list = list.filter(function (g) { return g.minPrice <= Number(q.maxPrice) })
    }
    // 仅看有货
    if (q.inStockOnly === '1' || q.inStockOnly === true) {
      list = list.filter(function (g) { return g.stock > 0 })
    }
    // 优惠类型（多选 OR）：member=会员价(memberPrice<现价)；promo=直降促销(原价-现价>=1000分/10元)
    if (q.discount) {
      var disc = String(q.discount).split(',').filter(Boolean)
      list = list.filter(function (g) {
        if (disc.indexOf('member') >= 0 && g.memberPrice > 0 && g.memberPrice < g.minPrice) return true
        if (disc.indexOf('promo') >= 0 && (g.originalPrice - g.minPrice) >= 1000) return true
        return disc.length === 0
      })
    }
    // 商品标签（多选 OR：命中任意所选标签）
    if (q.tags) {
      var wantTags = String(q.tags).split(',').filter(Boolean)
      list = list.filter(function (g) {
        return wantTags.some(function (t) { return g.tags.indexOf(t) >= 0 })
      })
    }
    // 排序：综合(默认/热度) / 价格升降 / 销量
    if (q.sort === 'price_asc') list.sort(function (a, b) { return a.minPrice - b.minPrice })
    else if (q.sort === 'price_desc') list.sort(function (a, b) { return b.minPrice - a.minPrice })
    else if (q.sort === 'sells') list.sort(function (a, b) { return b.numberSells - a.numberSells })
    else list.sort(function (a, b) { return (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || b.numberSells - a.numberSells })
    var paged = paginate(list, Number(q.page) || 1, Number(q.pageSize) || 10)
    // 推荐商品：仅在无搜索/无筛选时返回当前分类销量前3
    var recommend = []
    var hasActiveFilter = q.keyword || (q.minPrice !== undefined && q.minPrice !== '') || (q.maxPrice !== undefined && q.maxPrice !== '') || q.inStockOnly || q.discount || q.tags
    if (q.categoryId && !hasActiveFilter) {
      recommend = db.GOODS.filter(function (g) { return g.categoryId === Number(q.categoryId) })
        .sort(function (a, b) { return b.numberSells - a.numberSells }).slice(0, 3)
    }
    return ok({ list: paged.list.map(serializeGoods), total: paged.total, hasMore: paged.hasMore, page: paged.page, recommend: recommend.map(serializeGoods) })
  },

  // ---------- 筛选项：全部商品标签 + 优惠类型 ----------
  'GET /api/goods/tags': function () {
    var tagSet = {}
    db.GOODS.forEach(function (g) { g.tags.forEach(function (t) { tagSet[t] = true }) })
    return ok({
      tags: Object.keys(tagSet),
      discountOptions: [
        { key: 'member', name: '会员价' },
        { key: 'promo', name: '直降促销' }
      ]
    })
  },

  // ---------- 商品详情 ----------
  'GET /api/goods/detail': function (q) {
    var g = db.getGoods(Number(q.id)) || db.getGoodsBySku(q.sku)
    if (!g) return fail('商品不存在')
    var reviews = db.state.reviews.filter(function (r) { return r.goodsId === g.id })
    var recommend = db.GOODS.filter(function (x) { return x.categoryId === g.categoryId && x.id !== g.id }).slice(0, 4)
    var isCollect = db.state.favorites.indexOf(g.id) >= 0
    // 记录足迹
    var fp = db.state.footprints.filter(function (f) { return f.goodsId !== g.id })
    fp.unshift({ goodsId: g.id, time: Date.now() })
    db.state.footprints = fp.slice(0, 30)
    db.persist('footprints')
    return ok({
      goods: serializeGoods(g),
      reviews: reviews,
      recommend: recommend.map(serializeGoods),
      isCollect: isCollect,
      avgScore: reviews.length ? (reviews.reduce(function (s, r) { return s + r.score }, 0) / reviews.length).toFixed(1) : 5.0
    })
  },

  'GET /api/hotwords': function () {
    return ok({ list: ['车厘子', '葡萄', '酸奶', '螺蛳粉', '五花肉', '小龙虾', '胡萝卜', '抽纸', '牛排', '柠檬茶'] })
  },

  // ---------- 购物车 ----------
  'GET /api/cart': function () {
    var items = db.state.cart.map(mergeCartItem)
    var valid = items.filter(function (i) { return !i.invalid })
    var checked = valid.filter(function (i) { return i.checked })
    var totalCount = checked.reduce(function (s, i) { return s + i.count }, 0)
    var totalPrice = checked.reduce(function (s, i) { return s + i.subtotal }, 0)
    // 最高满减阶梯（需求9.2）
    var fr = fullReduction(totalPrice)
    return ok({
      items: items,
      validItems: valid,
      invalidItems: items.filter(function (i) { return i.invalid }),
      totalCount: totalCount,
      totalPrice: totalPrice,
      totalPriceYuan: fmt.yuan(totalPrice),
      allChecked: valid.length > 0 && valid.every(function (i) { return i.checked }),
      fullReduce: fr,
      fullReduceYuan: fmt.yuan(fr),
      nextTier: db.FULL_REDUCTION_RULES.filter(function (r) { return r.threshold > totalPrice })[0] || null
    })
  },
  'POST /api/cart/add': function (d) {
    var g = db.getGoods(Number(d.goodsId))
    if (!g) return fail('商品不存在')
    var specLabel = d.specLabel || '标准装'
    var spec = g.specs[0].values.filter(function (v) { return v.label === specLabel })[0] || g.specs[0].values[0]
    var count = Number(d.count) || 1
    var existing = db.state.cart.filter(function (c) { return c.goodsId === g.id && c.specText === specLabel })[0]
    if (existing) {
      existing.count = Math.min(existing.count + count, spec.stock)
      existing.checked = true
    } else {
      db.state.cart.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        goodsId: g.id,
        sku: g.sku,
        name: g.name,
        pic: g.pic,
        specText: specLabel,
        price: spec.price,
        count: count,
        checked: true,
        stock: spec.stock,
        invalid: false
      })
    }
    db.persist('cart')
    return ok({ cartCount: cartCount() })
  },
  'POST /api/cart/update': function (d) {
    var item = db.state.cart.filter(function (c) { return c.id === Number(d.id) })[0]
    if (!item) return fail('购物车项不存在')
    if (d.count !== undefined) {
      item.count = Math.max(1, Math.min(Number(d.count), item.stock))
    }
    if (d.checked !== undefined) item.checked = !!d.checked
    db.persist('cart')
    return ok({})
  },
  'POST /api/cart/toggleAll': function (d) {
    db.state.cart.forEach(function (c) {
      var g = db.getGoods(c.goodsId)
      if (g && g.stock > 0) c.checked = !!d.checked
    })
    db.persist('cart')
    return ok({})
  },
  'POST /api/cart/remove': function (d) {
    db.state.cart = db.state.cart.filter(function (c) { return c.id !== Number(d.id) })
    db.persist('cart')
    return ok({})
  },
  'POST /api/cart/clearInvalid': function () {
    db.state.cart = db.state.cart.filter(function (c) {
      var g = db.getGoods(c.goodsId)
      return g && g.stock > 0 && c.count <= g.stock
    })
    db.persist('cart')
    return ok({})
  },

  // ---------- 地址 ----------
  'GET /api/addresses/list': function () {
    return ok({ list: db.state.addresses })
  },
  'POST /api/addresses/save': function (d) {
    var addr = {
      id: d.id || Date.now(),
      name: d.name, phone: d.phone,
      province: d.province, city: d.city, district: d.district,
      detail: d.detail, tag: d.tag || '家',
      isDefault: !!d.isDefault, distanceKm: d.distanceKm || 3.0
    }
    if (addr.isDefault) db.state.addresses.forEach(function (a) { a.isDefault = false })
    var idx = db.state.addresses.findIndex(function (a) { return a.id === addr.id })
    if (idx >= 0) db.state.addresses[idx] = addr
    else db.state.addresses.push(addr)
    db.persist('addresses')
    return ok({ address: addr })
  },
  'POST /api/addresses/delete': function (d) {
    db.state.addresses = db.state.addresses.filter(function (a) { return a.id !== Number(d.id) })
    db.persist('addresses')
    return ok({})
  },
  'POST /api/addresses/setDefault': function (d) {
    db.state.addresses.forEach(function (a) { a.isDefault = (a.id === Number(d.id)) })
    db.persist('addresses')
    return ok({})
  },

  // ---------- 优惠券 ----------
  'GET /api/coupons/center': function () {
    var claimedIds = db.state.myCoupons.map(function (c) { return c.couponId })
    var list = db.COUPON_CENTER.map(function (c) {
      return Object.assign({}, c, { claimed: claimedIds.indexOf(c.id) >= 0 })
    })
    return ok({ list: list })
  },
  'GET /api/coupons/mine': function (q) {
    var list = db.state.myCoupons.slice()
    if (q.status) list = list.filter(function (c) { return c.status === Number(q.status) })
    return ok({ list: list })
  },
  'POST /api/coupons/claim': function (d) {
    var c = db.COUPON_CENTER.filter(function (x) { return x.id === Number(d.couponId) })[0]
    if (!c) return fail('优惠券不存在')
    var claimed = db.state.myCoupons.filter(function (x) { return x.couponId === c.id })
    if (claimed.length) return fail('您已领取过该优惠券')
    db.state.myCoupons.push({
      id: Date.now(), couponId: c.id, name: c.name, type: c.type,
      threshold: c.threshold, discount: c.discount, scope: c.scope,
      status: 1, expireTime: '', source: c.source
    })
    db.persist('myCoupons')
    return ok({})
  },

  // ---------- 订单 ----------
  'GET /api/orders/list': function (q) {
    var list = db.state.orders.slice().sort(function (a, b) { return b.createTime - a.createTime })
    if (q.status && q.status !== '0' && q.status !== 'all') {
      list = list.filter(function (o) { return o.status === Number(q.status) })
    }
    var paged = paginate(list, Number(q.page) || 1, Number(q.pageSize) || 10)
    return ok({ list: paged.list.map(orderView), total: paged.total, hasMore: paged.hasMore, page: paged.page })
  },
  'GET /api/orders/detail': function (q) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(q.id) })[0]
    if (!o) return fail('订单不存在')
    return ok({ order: orderView(o) })
  },
  'POST /api/orders/create': function (d) {
    var items
    if (d.items && d.items.length) {
      items = d.items
    } else {
      items = db.state.cart.filter(function (c) { return c.checked }).map(function (c) {
        return { goodsId: c.goodsId, sku: c.sku, name: c.name, pic: c.pic, specText: c.specText, price: c.price, count: c.count }
      })
    }
    if (!items.length) return fail('请选择要结算的商品')
    // 校验库存
    for (var i = 0; i < items.length; i++) {
      var g = db.getGoods(items[i].goodsId)
      if (!g) return fail('商品已下架')
      if (items[i].count > g.stock) return fail('【' + g.name + '】库存不足')
    }
    var total = items.reduce(function (s, it) { return s + it.price * it.count }, 0)
    // 满减（先满减，后用券）
    var fullReduce = fullReduction(total)
    var afterFull = total - fullReduce
    // 优惠券
    var discount = 0
    var coupon = null
    if (d.couponId) {
      coupon = db.state.myCoupons.filter(function (c) { return c.id === Number(d.couponId) && c.status === 1 })[0]
      if (coupon) {
        if (coupon.type === 1) {
          if (afterFull >= coupon.threshold) discount = coupon.discount
        } else if (coupon.type === 3) {
          discount = coupon.discount
        } else if (coupon.type === 2) {
          discount = Math.round(afterFull * (1 - coupon.discount / 100))
        }
      }
    }
    var finalAmount = afterFull - discount
    var freight = finalAmount >= 5900 ? 0 : 600
    var payAmount = finalAmount + freight
    var addr = db.state.addresses.filter(function (a) { return a.id === Number(d.addressId) })[0] || db.state.addresses.filter(function (a) { return a.isDefault })[0]
    if (!addr) return fail('请先添加收货地址')
    var now = Date.now()
    var isCod = d.payType === 2
    var order = {
      id: now,
      orderNo: 'FL' + String(now).slice(0, 13),
      status: isCod ? 2 : 1,
      items: items,
      totalAmount: total,
      fullReduceAmount: fullReduce,
      discountAmount: discount,
      freight: freight,
      payAmount: payAmount,
      couponId: coupon ? coupon.id : null,
      couponTitle: coupon ? coupon.name : '',
      payType: d.payType || 1,
      remark: d.remark || '',
      deliveryDate: d.deliverySlot || '尽快送达（预计45分钟）',
      deliverySlot: d.deliverySlot || '尽快送达（预计45分钟）',
      addressSnapshot: addr,
      rider: null,
      timeline: [{
        time: fmt.formatTime(now),
        status: '订单提交成功',
        remark: isCod ? '货到付款订单，商家正在备货' : '您的订单已提交，等待支付'
      }],
      isReviewed: false,
      createTime: now
    }
    db.state.orders.push(order)
    // 清空已结算购物车项
    if (!(d.items && d.items.length)) {
      db.state.cart = db.state.cart.filter(function (c) { return !c.checked })
    }
    pushMessage(2, '下单成功', '订单 ' + order.orderNo + ' 已提交，实付 ' + fmt.yuan(payAmount) + ' 元' + (isCod ? '（货到付款）' : '，等待支付'), order.id)
    db.persist('cart')
    db.persist('orders')
    return ok({ orderId: order.id, payAmount: fmt.yuan(payAmount) })
  },
  'POST /api/orders/pay': function (d) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(d.orderId) })[0]
    if (!o || o.status !== 1) return fail('订单状态异常')
    o.status = 2
    o.timeline.push({ time: fmt.formatTime(Date.now()), status: '支付成功', remark: '微信支付 ' + fmt.yuan(o.payAmount) + ' 元（演示环境）' })
    // 用券置为已使用
    if (o.couponId) {
      var c = db.state.myCoupons.filter(function (x) { return x.id === o.couponId })[0]
      if (c) { c.status = 2; c.useTime = fmt.formatTime(Date.now()) }
    }
    // 购物赠送积分（每消费1元1积分）+ 成长值
    addPoints(Math.floor(o.payAmount / 100), 1, '购物消费奖励（订单 #' + o.orderNo.slice(-8) + '）')
    db.state.member.growthValue = (db.state.member.growthValue || 0) + Math.floor(o.payAmount / 100)
    pushMessage(2, '支付成功', '订单 ' + o.orderNo + ' 支付成功 ' + fmt.yuan(o.payAmount) + ' 元，商家正在备货', o.id)
    db.persist('orders')
    db.persist('member')
    return ok({})
  },
  'POST /api/orders/cancel': function (d) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(d.orderId) })[0]
    if (!o || o.status !== 1) return fail('只有待付款订单可以取消')
    o.status = 6
    o.timeline.push({ time: fmt.formatTime(Date.now()), status: '订单已取消', remark: '用户取消订单' })
    pushMessage(2, '订单已取消', '订单 ' + o.orderNo + ' 已取消', o.id)
    db.persist('orders')
    return ok({})
  },
  'POST /api/orders/confirm': function (d) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(d.orderId) })[0]
    if (!o || (o.status !== 4 && o.status !== 3)) return fail('订单状态异常')
    o.status = 5
    o.timeline.push({ time: fmt.formatTime(Date.now()), status: '订单已完成', remark: '确认收货，订单完成' })
    pushMessage(2, '订单已送达', '订单 ' + o.orderNo + ' 已送达，感谢光临，期待再次光临', o.id)
    db.persist('orders')
    return ok({})
  },
  // 模拟配送进度：待发货→配送中→待收货→已完成（每调用推进一个节点）
  'POST /api/orders/advance': function (d) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(d.orderId) })[0]
    if (!o) return fail('订单不存在')
    var now = fmt.formatTime(Date.now())
    if (o.status === 2) {
      o.status = 3
      o.rider = { name: '李师傅', phone: '13812345678', avatar: '/images/avatar/a7.png' }
      o.timeline.push({ time: now, status: '骑手已取货', remark: '骑手李师傅（13812345678）正在配送，请保持电话畅通' })
      pushMessage(2, '骑手已取货', '订单 ' + o.orderNo + ' 已由骑手李师傅取货，正在配送中', o.id)
    } else if (o.status === 3) {
      o.status = 4
      o.timeline.push({ time: now, status: '包裹即将送达', remark: '配送员正在派送，请准备签收' })
      pushMessage(2, '即将送达', '订单 ' + o.orderNo + ' 即将送达，请保持电话畅通', o.id)
    } else if (o.status === 4) {
      o.status = 5
      o.timeline.push({ time: now, status: '订单已完成', remark: '包裹已送达，订单完成' })
      pushMessage(2, '订单已送达', '订单 ' + o.orderNo + ' 已送达，感谢光临', o.id)
    } else {
      return fail('当前状态无需推进')
    }
    db.persist('orders')
    return ok({ order: orderView(o) })
  },
  // 售后退款：已完成 → 退款成功
  'POST /api/orders/refund': function (d) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(d.orderId) })[0]
    if (!o) return fail('订单不存在')
    if (o.status !== 5) return fail('仅已完成订单可申请退款')
    o.status = 7
    o.refund = { reason: d.reason || '质量问题', amount: o.payAmount, time: fmt.formatTime(Date.now()) }
    o.timeline.push({ time: fmt.formatTime(Date.now()), status: '退款成功', remark: '原因：' + (d.reason || '质量问题') + '，' + fmt.yuan(o.payAmount) + ' 元原路退回（演示环境）' })
    pushMessage(2, '退款成功', '订单 ' + o.orderNo + ' 退款 ' + fmt.yuan(o.payAmount) + ' 元已原路退回', o.id)
    db.persist('orders')
    return ok({})
  },
  'POST /api/orders/review': function (d) {
    var o = db.state.orders.filter(function (x) { return x.id === Number(d.orderId) })[0]
    if (!o) return fail('订单不存在')
    d.goodsReviews.forEach(function (gr) {
      db.state.reviews.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        orderId: o.id,
        goodsId: gr.goodsId,
        userId: 'demo_user',
        userName: '鲜生活用户',
        avatar: '/images/avatar/default.png',
        score: gr.score,
        tags: gr.tags || [],
        content: gr.content || '',
        images: gr.images || [],
        createTime: Date.now()
      })
    })
    // 店铺评价
    if (d.shopScore) {
      o.shopReview = { scores: d.shopScore, content: d.shopText || '', createTime: Date.now() }
    }
    o.isReviewed = true
    addPoints(20, 3, '商品评价奖励')
    db.persist('reviews')
    db.persist('orders')
    return ok({})
  },

  // ---------- 积分 ----------
  'GET /api/points/list': function (q) {
    var all = db.state.pointsRecords.slice().sort(function (a, b) { return b.createTime - a.createTime })
    var paged = paginate(all, Number(q.page) || 1, Number(q.pageSize) || 10)
    return ok({ list: paged.list, total: paged.total, hasMore: paged.hasMore, balance: db.state.member.points })
  },
  'GET /api/points/shop': function () {
    return ok({
      balance: db.state.member.points,
      shops: [
        { id: 1, name: '5元无门槛券', cost: 100, desc: '全场通用，无门槛立减5元', type: 'coupon', couponId: 5 },
        { id: 2, name: '水果叉套装', cost: 300, desc: '精致不锈钢水果叉4件套', type: 'physical' },
        { id: 3, name: '30元满99券', cost: 500, desc: '满99元可用，全场通用', type: 'coupon', couponId: 2 },
        { id: 4, name: '当季水果3斤装', cost: 880, desc: '时令鲜果盲盒一份，顺丰包邮', type: 'physical' }
      ]
    })
  },
  'POST /api/points/exchange': function (d) {
    var shops = {
      1: { cost: 100, couponId: 5 },
      2: { cost: 300 },
      3: { cost: 500, couponId: 2 },
      4: { cost: 880 }
    }
    var shop = shops[Number(d.shopId)]
    if (!shop) return fail('兑换商品不存在')
    if (db.state.member.points < shop.cost) return fail('积分不足')
    if (shop.couponId) {
      var c = db.COUPON_CENTER.filter(function (x) { return x.id === shop.couponId })[0]
      db.state.myCoupons.push({
        id: Date.now(), couponId: c.id, name: c.name, type: c.type,
        threshold: c.threshold, discount: c.discount, scope: c.scope,
        status: 1, expireTime: '', source: '积分兑换'
      })
    }
    addPoints(-shop.cost, 4, '积分兑换消耗（-' + shop.cost + '分）')
    db.persist('member')
    db.persist('myCoupons')
    return ok({ balance: db.state.member.points })
  },

  // ---------- 签到 ----------
  'GET /api/checkin/status': function () {
    var today = fmt.formatDate(Date.now())
    var month = fmt.formatDate(Date.now()).slice(0, 7) // YYYY-MM
    var signedThisMonth = (db.state.checkin.signedDates || []).filter(function (d) { return d.indexOf(month) === 0 })
    return ok({
      checkedToday: db.state.checkin.lastDate === today,
      streak: db.state.checkin.streak,
      points: db.state.member.points,
      signedDates: db.state.checkin.signedDates || [],
      rewards: db.CHECKIN_REWARDS,
      month: month,
      signedThisMonth: signedThisMonth.length
    })
  },
  'POST /api/checkin/do': function () {
    var today = fmt.formatDate(Date.now())
    if (db.state.checkin.lastDate === today) return fail('今日已签到')
    var yesterday = fmt.formatDate(Date.now() - 86400000)
    db.state.checkin.streak = db.state.checkin.lastDate === yesterday ? db.state.checkin.streak + 1 : 1
    db.state.checkin.lastDate = today
    if (!db.state.checkin.signedDates) db.state.checkin.signedDates = []
    if (db.state.checkin.signedDates.indexOf(today) < 0) db.state.checkin.signedDates.push(today)
    var earned = db.CHECKIN_REWARDS[(db.state.checkin.streak - 1) % 7]
    addPoints(earned, 2, '每日签到奖励（连签第' + db.state.checkin.streak + '天）')
    pushMessage(1, '签到成功', '本次签到获得 ' + earned + ' 积分，已连续签到 ' + db.state.checkin.streak + ' 天', null)
    db.persist('checkin')
    db.persist('messages')
    return ok({ streak: db.state.checkin.streak, earned: earned })
  },

  // ---------- 收藏 / 足迹 ----------
  'GET /api/favorites/list': function () {
    var list = db.state.favorites.map(function (id) { return serializeGoods(db.getGoods(id)) }).filter(Boolean)
    return ok({ list: list })
  },
  'POST /api/favorites/toggle': function (d) {
    var id = Number(d.goodsId)
    var idx = db.state.favorites.indexOf(id)
    if (idx >= 0) { db.state.favorites.splice(idx, 1); return ok({ isCollect: false }) }
    db.state.favorites.unshift(id)
    db.persist('favorites')
    return ok({ isCollect: true })
  },
  'GET /api/footprints/list': function () {
    var list = db.state.footprints.map(function (f) {
      var g = db.getGoods(f.goodsId)
      if (!g) return null
      return Object.assign(serializeGoods(g), { time: f.time, timeText: fmt.fromNow(f.time) })
    }).filter(Boolean)
    return ok({ list: list })
  },
  'POST /api/footprints/remove': function (d) {
    db.state.footprints = db.state.footprints.filter(function (f) { return f.goodsId !== Number(d.goodsId) })
    db.persist('footprints')
    return ok({})
  },
  'POST /api/footprints/clear': function () {
    db.state.footprints = []
    db.persist('footprints')
    return ok({})
  },

  // ---------- 消息（分类 + 分页 + 单条已读）----------
  'GET /api/messages/list': function (q) {
    var list = db.state.messages.slice().sort(function (a, b) { return b.createTime - a.createTime })
    if (q.type && q.type !== 'all') {
      list = list.filter(function (m) { return m.type === Number(q.type) })
    }
    var paged = paginate(list, Number(q.page) || 1, Number(q.pageSize) || 10)
    return ok({
      list: paged.list.map(function (m) {
        return Object.assign({}, m, { timeText: fmt.fromNow(m.createTime) })
      }),
      total: paged.total,
      hasMore: paged.hasMore,
      unread: db.state.messages.filter(function (m) { return !m.isRead }).length
    })
  },
  'POST /api/messages/readAll': function () {
    db.state.messages.forEach(function (m) { m.isRead = true })
    db.persist('messages')
    return ok({})
  },
  'POST /api/messages/readOne': function (d) {
    var m = db.state.messages.filter(function (x) { return x.id === Number(d.id) })[0]
    if (m) { m.isRead = true; db.persist('messages') }
    return ok({})
  },
  // mock 延迟推送：进入消息中心 3 秒后推送一条抢购提醒
  'POST /api/messages/pushDemo': function () {
    var exists = db.state.messages.filter(function (m) { return m.content.indexOf('20:00 场限时抢购即将开始') >= 0 }).length
    if (!exists) {
      pushMessage(3, '限时抢购提醒', '20:00 场限时抢购即将开始，车厘子低至 ￥24.9，定好闹钟！', { page: 'promotion', tab: 'seckill' })
    }
    return ok({ list: db.state.messages.slice().sort(function (a, b) { return b.createTime - a.createTime }).map(function (m) {
      return Object.assign({}, m, { timeText: fmt.fromNow(m.createTime) })
    }) })
  },

  // ---------- 促销活动（限时抢购 + 满减）----------
  'GET /api/promotion/home': function (q) {
    var now = new Date()
    var curMin = now.getHours() * 60 + now.getMinutes()
    // 场次状态：未开始(1)/抢购中(2)/已结束(3)，以当日时间判断
    var sessions = db.SECKILL_SESSIONS.map(function (s) {
      var startMin = s.hour * 60 + s.minute
      var endMin = startMin + 240 // 每场 4 小时
      var status = curMin >= startMin && curMin < endMin ? 2 : (curMin < startMin ? 1 : 3)
      return Object.assign({}, s, { status: status })
    })
    var activeSession = sessions.filter(function (s) { return s.status === 2 })[0] || sessions[0]
    // 抢购商品：带场次标记，组装商品信息
    var seckillList = db.SECKILL_GOODS.map(function (sk) {
      var g = db.getGoods(sk.goodsId)
      var sess = sessions.filter(function (s) { return s.sessionId === sk.sessionId })[0]
      return Object.assign(serializeGoods(g), {
        goodsId: sk.goodsId,
        seckillPrice: sk.seckillPrice,
        seckillPriceYuan: fmt.yuan(sk.seckillPrice),
        seckillStock: sk.stock,
        soldPercent: sk.soldPercent,
        sessionId: sk.sessionId,
        sessionName: sess.name,
        sessionStatus: sess.status
      })
    })
    var fullReduce = db.FULL_REDUCTION_RULES.map(function (r) {
      return Object.assign({}, r, {
        thresholdYuan: fmt.yuan(r.threshold),
        reduceYuan: fmt.yuan(r.reduce)
      })
    })
    // 满减参与商品（取 8 个高销量商品）
    var fullReduceGoods = db.GOODS.slice().sort(function (a, b) { return b.numberSells - a.numberSells }).slice(0, 8).map(serializeGoods)
    return ok({
      sessions: sessions,
      activeSession: activeSession,
      serverTime: Date.now(),
      seckillList: seckillList,
      fullReduceRules: fullReduce,
      fullReduceGoods: fullReduceGoods
    })
  },

  // ---------- 拼团 ----------
  'GET /api/group/list': function () {
    return ok({ list: db.state.groupBuys })
  },
  'POST /api/group/join': function (d) {
    var g = db.state.groupBuys.filter(function (x) { return x.id === Number(d.groupId) })[0]
    if (!g) return fail('拼团活动不存在')
    if (g.status === 2) return fail('该团已结束')
    var already = db.state.myJoins.filter(function (j) { return j.groupId === g.id }).length
    if (already) return fail('您已参与该拼团')
    g.joinedCount += 1
    g.members.push({ avatar: '/images/avatar/default.png', name: '鲜生活用户', isLeader: false })
    var formed = g.joinedCount >= g.requiredCount
    if (formed) {
      g.status = 2
      g.endTime = '已成团'
    }
    db.state.myJoins.push({ groupId: g.id, time: Date.now(), formed: formed })
    db.persist('groupBuys')
    db.persist('myJoins')
    return ok({ formed: formed, joinedCount: g.joinedCount, requiredCount: g.requiredCount })
  },
  'GET /api/group/my': function () {
    var list = db.state.myJoins.map(function (j) {
      var g = db.state.groupBuys.filter(function (x) { return x.id === j.groupId })[0]
      if (!g) return null
      return Object.assign({}, g, { joinTime: j.time, joinTimeText: fmt.fromNow(j.time) })
    }).filter(Boolean)
    return ok({ list: list })
  },

  // ---------- 会员 ----------
  'GET /api/member/info': function () {
    return ok({ member: db.state.member })
  },

  // ---------- 会员中心页 ----------
  'GET /api/vip/home': function () {
    // 会员专享商品（取部分商品，展示会员价）
    var memberGoods = db.GOODS.slice(0, 8).map(function (g) {
      return {
        id: g.id, name: g.name, subtitle: g.subtitle, pic: g.pic,
        originalPrice: g.originalPrice, originalPriceYuan: fmt.yuan(g.originalPrice),
        vipPrice: g.memberPrice, vipPriceYuan: fmt.yuan(g.memberPrice),
        arrive: g.stock > 0 ? '现货发售' : '到货提醒'
      }
    })
    var redPackets = [
      { id: 1, name: '满59减8', amount: '8元', usable: true },
      { id: 2, name: '无门槛5元', amount: '5元', usable: true },
      { id: 3, name: '生日8.8折券', amount: '8.8折', usable: true, reason: '生日月专属' }
    ]
    // 成长体系 5 级
    var levels = [
      { level: 1, name: '普通会员', threshold: 0, discount: '无折扣', privileges: ['基础配送', '积分累计'] },
      { level: 2, name: '银卡会员', threshold: 1000, discount: '98折', privileges: ['专属折扣98折', '每月赠券', '免配送费门槛59元'] },
      { level: 3, name: '金卡会员', threshold: 3000, discount: '95折', privileges: ['专属折扣95折', '每月赠券', '免配送费门槛59元', '优先配送'] },
      { level: 4, name: '铂金会员', threshold: 6000, discount: '93折', privileges: ['专属折扣93折', '生日礼包升级', '免配送费门槛39元', '专属客服'] },
      { level: 5, name: '钻石会员', threshold: 10000, discount: '92折', privileges: ['专属折扣92折', '生日礼包升级', '免配送费门槛39元', '专属客服', '优先配送'] }
    ]
    var m = db.state.member
    var current = levels.filter(function (l) { return l.level === m.level })[0]
    var next = levels.filter(function (l) { return l.level === m.level + 1 })[0]
    return ok({
      member: m,
      privileges: m.privileges,
      redPackets: redPackets,
      products: memberGoods,
      yearlySaving: 1121.30,
      levels: levels,
      currentLevel: current,
      nextLevel: next,
      growthProgress: next ? Math.min(100, Math.round(m.growthValue / next.threshold * 100)) : 100,
      toNext: next ? Math.max(0, next.threshold - m.growthValue) : 0,
      birthdayGift: true
    })
  },

  // ---------- 店铺主页（评分 + 配送说明）----------
  'GET /api/shop/info': function () {
    var totalReviews = db.state.reviews.length
    var avg = totalReviews
      ? (db.state.reviews.reduce(function (s, r) { return s + r.score }, 0) / totalReviews).toFixed(1)
      : '4.8'
    return ok({
      shopName: '鲜生活旗舰店',
      rating: avg,
      totalReviews: totalReviews,
      sales: 286000,
      delivery: { free: '满59元免基础配送费', fee: '未满收6元', eta: '预计45分钟送达', cod: '支持货到付款' },
      promises: ['产地直发，当季现摘', '坏果包赔，7天无忧退换', '100%第三方权威检测', '冷链配送锁住新鲜']
    })
  },

  // ---------- 抢购加购（按抢购价）----------
  'POST /api/seckill/buy': function (d) {
    var gid = Number(d.goodsId || d.id)
    var sk = db.SECKILL_GOODS.filter(function (x) { return x.goodsId === gid })[0]
    if (!sk) return fail('抢购商品不存在')
    var g = db.getGoods(sk.goodsId)
    var existing = db.state.cart.filter(function (c) { return c.goodsId === g.id && c.specText === '抢购价' })[0]
    if (existing) {
      existing.count = Math.min(existing.count + 1, sk.stock)
    } else {
      db.state.cart.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        goodsId: g.id, sku: g.sku, name: g.name, pic: g.pic,
        specText: '限时抢购价', price: sk.seckillPrice, count: 1,
        checked: true, stock: sk.stock, invalid: false
      })
    }
    db.persist('cart')
    return ok({ cartCount: cartCount() })
  }
}

// ===== 辅助 =====
function cartCount() {
  return db.state.cart.filter(function (c) {
    var g = db.getGoods(c.goodsId)
    return g && g.stock > 0
  }).reduce(function (s, c) { return s + c.count }, 0)
}

function addPoints(points, type, desc) {
  db.state.member.points = (db.state.member.points || 0) + points
  db.state.pointsRecords.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: type, points: points, desc: desc, createTime: Date.now()
  })
  db.persist('member')
  db.persist('pointsRecords')
}

// 生成一条消息并持久化
function pushMessage(type, title, content, relatedId) {
  var nextId = db.state.messages.reduce(function (m, x) { return Math.max(m, x.id) }, 0) + 1
  db.state.messages.unshift({
    id: nextId,
    type: type,
    title: title,
    content: content,
    isRead: false,
    createTime: Date.now(),
    relatedId: relatedId || null
  })
  db.persist('messages')
}

// 满减阶梯：返回最高可享减免（分）
function fullReduction(total) {
  var reduce = 0
  db.FULL_REDUCTION_RULES.forEach(function (r) {
    if (total >= r.threshold && r.reduce > reduce) reduce = r.reduce
  })
  return reduce
}

function serializeGoods(g) {
  return {
    id: g.id, sku: g.sku, name: g.name, subtitle: g.subtitle,
    pic: g.pic, pics: g.pics, categoryId: g.categoryId, categoryName: g.categoryName,
    minPrice: g.minPrice, minPriceYuan: fmt.yuan(g.minPrice),
    originalPrice: g.originalPrice, originalPriceYuan: fmt.yuan(g.originalPrice),
    memberPrice: g.memberPrice, memberPriceYuan: fmt.yuan(g.memberPrice),
    numberSells: g.numberSells, stock: g.stock, unit: g.unit, origin: g.origin,
    tags: g.tags, specs: g.specs, description: g.description, detailImages: g.detailImages,
    viewCount: g.viewCount, collectCount: g.collectCount, hot: g.hot
  }
}

function orderView(o) {
  var items = o.items.map(function (it) {
    return Object.assign({}, it, {
      priceYuan: fmt.yuan(it.price),
      subtotalYuan: fmt.yuan(it.price * it.count)
    })
  })
  return Object.assign({}, o, {
    items: items,
    totalAmountYuan: fmt.yuan(o.totalAmount),
    fullReduceAmountYuan: fmt.yuan(o.fullReduceAmount || 0),
    discountAmountYuan: fmt.yuan(o.discountAmount),
    freightYuan: fmt.yuan(o.freight),
    payAmountYuan: fmt.yuan(o.payAmount),
    createTimeText: fmt.formatTime(o.createTime),
    statusText: ['', '待付款', '待发货', '配送中', '待收货', '已完成', '已取消', '退款成功'][o.status]
  })
}

// ===== 请求拦截 =====
function parseUrl(url) {
  var idx = url.indexOf('?')
  var path = idx >= 0 ? url.slice(0, idx) : url
  var query = {}
  if (idx >= 0) {
    var pairs = url.slice(idx + 1).split('&')
    pairs.forEach(function (p) {
      if (!p) return
      var kv = p.split('=')
      query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '')
    })
  }
  return { path: path, query: query }
}

function setup() {
  wx.request = function (options) {
    var method = (options.method || 'GET').toUpperCase()
    var parsed = parseUrl(options.url)
    var key = method + ' ' + parsed.path
    var handler = routes[key]
    if (!handler) {
      // 非 /api 请求放行
      return originalRequest.call(wx, options)
    }
    var data = options.data || {}
    delay(function () {
      var res
      try {
        // GET handler 第一个参数为 query；POST handler 第一个参数为 body
        res = handler(method === 'POST' ? data : parsed.query, parsed.query, data)
      } catch (e) {
        res = fail('服务器异常：' + e.message)
      }
      var fakeRes = { statusCode: 200, data: res, header: {} }
      if (options.success) options.success(fakeRes)
      if (options.complete) options.complete(fakeRes)
    })
  }
}

module.exports = { setup: setup }
