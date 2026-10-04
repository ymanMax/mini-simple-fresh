// ============================================================
// Mock 数据层（方案B）：拦截 wx.request，内存数据库 + storage 持久化
// 所有写操作在内存真实生效并持久化，保证跨页面一致
// ============================================================
var F = require('./format.js')

// ---------- 本地图片（无失效 CDN） ----------
function itemPic(i) {
  var n = (i % 20) + 1
  return '/https/images/item/' + (n < 10 ? '0' + n : '' + n) + '.jpg'
}
var AVATARS = [
  '/https/images/me-icon/01.png',
  '/https/images/me-icon/02.png',
  '/https/images/me-icon/03.png',
  '/https/images/me-icon/04.png',
  '/https/images/me-icon/05.png'
]
var DEFAULT_IMG = '/static/images/default.png'

// ---------- 分类 ----------
var CATEGORIES = [
  { id: 1, name: '水果', icon: '/https/images/icons/tag.png' },
  { id: 2, name: '蔬菜', icon: '/https/images/icons/tag.png' },
  { id: 3, name: '肉类', icon: '/https/images/icons/tag.png' },
  { id: 4, name: '水产', icon: '/https/images/icons/tag.png' },
  { id: 5, name: '乳品', icon: '/https/images/icons/tag.png' },
  { id: 6, name: '零食', icon: '/https/images/icons/tag.png' },
  { id: 7, name: '饮品', icon: '/https/images/icons/tag.png' },
  { id: 8, name: '日用', icon: '/https/images/icons/tag.png' }
]

// ---------- 商品种子：[名称,分类,单价(分),原价(分),单位,产地,副标题,库存,销量,标签] ----------
var GOODS_SEED = [
  ['美国车厘子400g*1盒', '水果', 2990, 3990, '盒', '美国', '颗颗饱满 脆甜多汁', 31, 193171, ['顺丰包邮', '产地直发', '坏果包赔']],
  ['阳光玫瑰葡萄 2斤装', '水果', 3580, 4580, '箱', '云南', '无籽脆甜 果香浓郁', 42, 86210, ['当季现摘', '坏果包赔']],
  ['海南贵妃芒果 3斤装', '水果', 1990, 2690, '箱', '海南', '核小肉厚 香甜软糯', 55, 65430, ['产地直发', '坏果包赔']],
  ['赣南脐橙 5斤装', '水果', 2490, 3190, '箱', '江西', '维C满满 酸甜适口', 80, 92140, ['当季现摘', '坏果包赔']],
  ['丹东99草莓 1盒装', '水果', 2680, 3280, '盒', '辽宁丹东', '红颜草莓 奶香浓郁', 24, 54320, ['顺丰包邮', '产地直发']],
  ['麒麟西瓜 1个约8斤', '水果', 1890, 2390, '个', '宁夏', '沙瓤爆汁 清甜解渴', 66, 71200, ['当季现摘']],
  ['泰国山竹 3A 2斤装', '水果', 3280, 3980, '箱', '泰国', '皇后水果 果肉雪白', 38, 43100, ['进口直供', '坏果包赔']],
  ['红富士苹果 5斤装', '水果', 2190, 2790, '箱', '山东烟台', '脆甜爽口 新鲜直发', 95, 120300, ['产地直发', '坏果包赔']],

  ['山东贝贝南瓜 2个装', '蔬菜', 1290, 1690, '份', '山东', '粉糯香甜 宝宝辅食', 70, 48600, ['产地直发']],
  ['有机西兰花 1颗', '蔬菜', 690, 890, '颗', '云南', '脆嫩新鲜 健康轻食', 88, 32100, ['有机认证']],
  ['沙瓤西红柿 2斤装', '蔬菜', 990, 1390, '箱', '山东', '生吃酸甜 自然成熟', 75, 56800, ['当季现摘', '产地直发']],
  ['新鲜油麦菜 300g', '蔬菜', 490, 690, '份', '本地', '鲜嫩脆爽 火锅必备', 120, 21400, ['当日达']],
  ['铁棍山药 2斤装', '蔬菜', 1590, 1990, '箱', '河南', '粉面香甜 滋补养生', 58, 38900, ['产地直发']],
  ['白玉菇 150g', '蔬菜', 590, 790, '盒', '福建', '火锅煲汤 鲜美滑嫩', 96, 18700, ['当日达']],

  ['原切西冷牛排 200g', '肉类', 3990, 4990, '份', '阿根廷', '整切原切 鲜嫩多汁', 40, 67800, ['冷链配送', '顺丰包邮']],
  ['鸡胸肉 1kg', '肉类', 1390, 1790, '袋', '国产', '低脂健身 高蛋白', 85, 45300, ['冷链配送']],
  ['农家五花肉 500g', '肉类', 1890, 2290, '份', '本地', '肥瘦相间 红烧首选', 62, 33200, ['当日达', '冷链配送']],
  ['猪前排 500g', '肉类', 1590, 1990, '份', '本地', '新鲜屠宰 煲汤佳品', 70, 28700, ['当日达', '冷链配送']],
  ['牛腩块 1kg', '肉类', 2990, 3590, '袋', '国产', '软烂入味 红烧炖煮', 48, 39100, ['冷链配送', '顺丰包邮']],
  ['鸡翅中 1kg', '肉类', 2190, 2690, '袋', '国产', '鲜嫩多汁 烤炸皆宜', 66, 41200, ['冷链配送']],

  ['智利三文鱼刺身 200g', '水产', 4990, 5990, '盒', '智利', '刺身级 新鲜直达', 22, 36500, ['顺丰包邮', '冷链配送']],
  ['鲜活基围虾 500g', '水产', 3590, 4290, '份', '湛江', '鲜活蹦跳 白灼鲜甜', 35, 29800, ['鲜活配送', '冷链配送']],
  ['波士顿龙虾 1只约1.5斤', '水产', 12900, 15900, '只', '加拿大', '鲜活大虾 宴客硬菜', 12, 12300, ['顺丰包邮', '鲜活配送']],
  ['鲜活鲈鱼 1条约1.2斤', '水产', 2390, 2890, '条', '广东', '清蒸鲜美 刺少肉嫩', 28, 21500, ['鲜活配送', '冷链配送']],
  ['扇贝肉 500g', '水产', 1990, 2490, '袋', '山东', '鲜甜Q弹 蒜蓉粉丝', 45, 18900, ['冷链配送']],

  ['鲜牛奶 950ml', '乳品', 1290, 1590, '盒', '本地牧场', '巴氏杀菌 新鲜直达', 60, 52400, ['当日达', '冷链配送']],
  ['原味酸奶 4连杯', '乳品', 990, 1290, '组', '国产', '益生菌 健康美味', 80, 44100, ['冷链配送']],
  ['儿童奶酪棒 500g', '乳品', 1890, 2290, '袋', '国产', '高钙营养 宝宝爱吃', 55, 27600, ['冷链配送']],
  ['无糖豆浆 300ml*6', '乳品', 1590, 1890, '箱', '国产', '现磨浓香 植物蛋白', 72, 19800, []],

  ['每日坚果 750g/30包', '零食', 2990, 3690, '箱', '国产', '30种搭配 每日一包', 90, 78900, ['独立包装']],
  ['芒果干 100g', '零食', 990, 1290, '袋', '菲律宾', '厚切果肉 酸甜软糯', 110, 36700, []],
  ['原味薯片 104g', '零食', 690, 890, '袋', '国产', '香脆可口 追剧必备', 130, 42300, []],
  ['纯黑巧克力 70% 100g', '零食', 1390, 1690, '盒', '比利时', '可可浓郁 丝滑回甘', 48, 15600, ['进口直供']],

  ['鲜榨橙汁 300ml', '饮品', 890, 1190, '瓶', '本地', '100%鲜果 无添加', 95, 28400, ['当日达', '冷链配送']],
  ['无糖气泡水 500ml*6', '饮品', 1590, 1990, '箱', '国产', '0糖0卡 清爽解腻', 100, 33200, []],
  ['精酿啤酒 330ml*4', '饮品', 2490, 2990, '组', '国产', '麦香浓郁 聚会畅饮', 40, 16800, []],
  ['冷萃乌龙茶 500ml', '饮品', 790, 990, '瓶', '福建', '原叶萃取 回甘清香', 120, 22100, []],

  ['原生木浆抽纸 24包', '日用', 1990, 2590, '箱', '国产', '加厚柔韧 家庭装', 150, 61200, ['包邮']],
  ['洗衣液 3kg', '日用', 2990, 3690, '瓶', '国产', '深层洁净 留香持久', 80, 34500, ['包邮']],
  ['保鲜盒套装 5件套', '日用', 1690, 2190, '套', '国产', '食品级 冰箱收纳', 55, 12900, []],
  ['厨房湿巾 80抽', '日用', 890, 1190, '包', '国产', '去油污 一擦即净', 140, 19300, []]
]

// ---------- 由种子生成标准化商品 ----------
function buildGoods() {
  var list = []
  for (var i = 0; i < GOODS_SEED.length; i++) {
    var s = GOODS_SEED[i]
    var price = s[2], orig = s[3]
    var catId = CATEGORIES.filter(function (c) { return c.name === s[1] })[0].id
    var pic = itemPic(i)
    var specs = [
      {
        name: '规格',
        values: [
          { label: '尝鲜装', price: Math.round(price * 0.85), stock: Math.floor(s[7] / 3), pic: pic },
          { label: '标准装', price: price, stock: s[7], pic: pic },
          { label: '家庭装', price: Math.round(price * 1.25), stock: Math.floor(s[7] / 2), pic: pic }
        ]
      }
    ]
    list.push({
      id: i + 1,
      sku: 'p-' + (i + 1) + '-fl',
      name: s[0],
      subtitle: s[5] + ' · ' + s[6],
      pic: pic,
      pics: [pic, itemPic(i + 3), itemPic(i + 7), itemPic(i + 11)],
      categoryId: catId,
      categoryName: s[1],
      minPrice: price,
      originalPrice: orig,
      stock: s[7],
      unit: s[4],
      origin: s[5],
      tags: s[9],
      specs: specs,
      description: s[5] + '直供，' + s[6] + '。全程冷链/当日达配送，坏果包赔，安心食用。',
      detailImages: [pic, itemPic(i + 3), itemPic(i + 7)],
      salesVolume: s[8],
      viewCount: 1000 + s[8],
      collectCount: 200 + (s[8] % 500),
      isCollect: false,
      hot: s[8] > 50000,
      memberPrice: Math.round(price * 0.92),
      videoUrl: '',
      videoCover: pic
    })
  }
  return list
}

var GOODS = buildGoods()

// ---------- storage key ----------
var KEY = {
  cart: 'fl_cart', orders: 'fl_orders', addresses: 'fl_addresses',
  userCoupons: 'fl_user_coupons', reviews: 'fl_reviews', points: 'fl_points',
  messages: 'fl_messages', favorites: 'fl_favorites', footprints: 'fl_footprints',
  checkin: 'fl_checkin', user: 'fl_user', member: 'fl_member', usedCoupon: 'fl_used_coupons'
}

function load(key, fallback) {
  try {
    var v = wx.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    return fallback
  }
}
function persist(key, val) {
  try { wx.setStorageSync(key, val) } catch (e) {}
}

// ---------- 种子：地址 ----------
function seedAddresses() {
  return [
    { id: 1, name: '张小鲜', phone: '13800138000', province: '北京市', city: '北京市', district: '朝阳区', detail: '望京街道花园小区3号楼2单元501室', tag: '家', isDefault: true, distanceKm: 3.2 },
    { id: 2, name: '张小鲜', phone: '13800138000', province: '北京市', city: '北京市', district: '海淀区', detail: '中关村大街1号科技大厦B座12层', tag: '公司', isDefault: false, distanceKm: 8.6 }
  ]
}

// ---------- 种子：领券中心 ----------
var COUPON_CENTER = [
  { id: 1, name: '新人满减券', type: 1, threshold: 39, discount: 10, scope: '全场通用', expireDays: 7, total: 1000, remain: 866 },
  { id: 2, name: '生鲜满59减8', type: 1, threshold: 59, discount: 8, scope: '全场通用', expireDays: 15, total: 2000, remain: 1520 },
  { id: 3, name: '满99减20', type: 1, threshold: 99, discount: 20, scope: '全场通用', expireDays: 30, total: 1000, remain: 730 },
  { id: 4, name: '水果专享9.5折', type: 2, threshold: 0, discount: 95, scope: '限水果品类', expireDays: 15, total: 800, remain: 540 },
  { id: 5, name: '5元无门槛券', type: 3, threshold: 0, discount: 5, scope: '全场通用', expireDays: 7, total: 500, remain: 312 }
]

// ---------- 种子：评价 ----------
function seedReviews() {
  var contents = [
    '果子很新鲜，个头大，甜！包装严实，顺丰冷链很快，下次还买。',
    '口感不错，和描述一致，坏果包赔很放心，配送准时。',
    '回购多次了，品质稳定，性价比高，家里人都喜欢。',
    '包装精致，冷链到位，收到还是冰的，味道非常好。',
    '产地直发就是新鲜，分量足，值得推荐。'
  ]
  var tagsPool = ['新鲜', '口感甜', '包装好', '个头大', '配送快', '性价比高']
  var reviews = []
  for (var i = 0; i < 26; i++) {
    var g = GOODS[i % GOODS.length]
    reviews.push({
      id: i + 1,
      orderId: 900 + i,
      goodsId: g.id,
      userId: 'u' + (i + 1),
      userName: ['鲜果控', '爱吃水果的猫', '生活家', '厨房达人', '健康饮食', '老顾客'][i % 6],
      avatar: AVATARS[i % AVATARS.length],
      score: 4 + (i % 2),
      tags: tagsPool.slice(0, 2 + (i % 3)),
      content: contents[i % contents.length],
      images: [itemPic(i), itemPic(i + 5)],
      createTime: Date.now() - (i + 1) * 86400000 * 2
    })
  }
  return reviews
}

// ---------- 种子：订单 ----------
function seedOrders() {
  var statuses = [5, 5, 4, 3, 2, 1, 5, 6, 4, 5, 2, 3]
  var orders = []
  var now = Date.now()
  for (var i = 0; i < 12; i++) {
    var gi = (i * 3) % GOODS.length
    var g1 = GOODS[gi]
    var g2 = GOODS[(gi + 5) % GOODS.length]
    var items = [
      { goodsId: g1.id, name: g1.name, pic: g1.pic, specText: '标准装', price: g1.minPrice, count: 1 + (i % 2) },
      { goodsId: g2.id, name: g2.name, pic: g2.pic, specText: '尝鲜装', price: g2.minPrice, count: 1 }
    ]
    var goodsTotal = items[0].price * items[0].count + items[1].price * items[1].count
    var freight = goodsTotal >= 5900 ? 0 : 600
    var payAmount = goodsTotal + freight
    var status = statuses[i]
    var timeline = buildTimeline(status, now - i * 86400000)
    orders.push({
      id: 1000 + i,
      orderNo: F.genOrderNo().slice(0, 12) + (900 + i),
      status: status,
      items: items,
      totalAmount: goodsTotal,
      discountAmount: 0,
      freight: freight,
      payAmount: payAmount,
      couponId: null,
      couponTitle: '',
      payType: 1,
      remark: '',
      deliveryDate: '尽快送达',
      deliverySlot: '尽快送达（预计45分钟）',
      addressSnapshot: { name: '张小鲜', phone: '13800138000', address: '北京市朝阳区望京街道花园小区3号楼2单元501室' },
      rider: status >= 3 ? { name: '李骑手', phone: '13900139000', avatar: '/https/images/me-icon/02.png' } : null,
      timeline: timeline,
      isReviewed: status === 5 && i % 3 !== 1,
      createTime: now - i * 86400000 * 1.5
    })
  }
  return orders
}

function buildTimeline(status, t) {
  var steps = [
    { time: F.formatTime(t), status: '已下单', remark: '订单提交成功，等待支付' },
    { time: F.formatTime(t + 10 * 60000), status: '已支付', remark: '支付成功，仓库分拣中' },
    { time: F.formatTime(t + 25 * 60000), status: '分拣完成', remark: '商品已打包，等待取货' },
    { time: F.formatTime(t + 40 * 60000), status: '骑手取货', remark: '李骑手 13900139000 正在配送' },
    { time: F.formatTime(t + 75 * 60000), status: '已送达', remark: '感谢购买，期待再次光临' }
  ]
  var idxMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 1 }
  return steps.slice(0, idxMap[status] || 1)
}

// ---------- 种子：消息 ----------
function seedMessages() {
  return [
    { id: 1, type: 1, title: '欢迎使用鲜生到家', content: '新人注册即享多重好礼，满39减10，速来领取～', isRead: false, createTime: Date.now() - 86400000, relatedId: null },
    { id: 2, type: 2, title: '订单发货提醒', content: '您的订单已由骑手取货，正在配送中，请保持电话畅通。', isRead: false, createTime: Date.now() - 3600000, relatedId: null },
    { id: 3, type: 3, title: '限时秒杀', content: '今日车厘子限时秒杀，会员专享价低至8.8折！', isRead: true, createTime: Date.now() - 7200000, relatedId: null },
    { id: 4, type: 4, title: '评价有礼', content: '完成订单评价可获20积分奖励，积分可兑换好礼。', isRead: true, createTime: Date.now() - 2 * 86400000, relatedId: null }
  ]
}

// ---------- 种子：积分记录 ----------
function seedPoints() {
  return [
    { id: 1, type: 2, points: 10, desc: '每日签到奖励', createTime: Date.now() - 86400000 },
    { id: 2, type: 1, points: 120, desc: '购物消费返积分', createTime: Date.now() - 3 * 86400000 },
    { id: 3, type: 3, points: 20, desc: '商品评价奖励', createTime: Date.now() - 5 * 86400000 },
    { id: 4, type: 5, points: 50, desc: '生日礼包赠送', createTime: Date.now() - 10 * 86400000 }
  ]
}

// ---------- 种子：用户券 ----------
function seedUserCoupons() {
  return [
    { id: 101, name: '新人满减券', type: 1, threshold: 39, discount: 10, scope: '全场通用', status: 1, expireTime: F.formatDate(Date.now() + 7 * 86400000), source: '新人注册赠送' },
    { id: 102, name: '生鲜满59减8', type: 1, threshold: 59, discount: 8, scope: '全场通用', status: 1, expireTime: F.formatDate(Date.now() + 15 * 86400000), source: '领取' },
    { id: 103, name: '已使用满99减20', type: 1, threshold: 99, discount: 20, scope: '全场通用', status: 2, expireTime: F.formatDate(Date.now() - 5 * 86400000), source: '领取' },
    { id: 104, name: '过期无门槛券', type: 3, threshold: 0, discount: 5, scope: '全场通用', status: 3, expireTime: F.formatDate(Date.now() - 10 * 86400000), source: '领取' }
  ]
}

// ---------- 数据库 ----------
var db = {
  goods: GOODS,
  categories: CATEGORIES,
  couponCenter: COUPON_CENTER,
  cart: load(KEY.cart, []),
  orders: load(KEY.orders, null) || seedOrders(),
  addresses: load(KEY.addresses, null) || seedAddresses(),
  userCoupons: load(KEY.userCoupons, null) || seedUserCoupons(),
  reviews: load(KEY.reviews, null) || seedReviews(),
  pointsRecords: load(KEY.points, null) || seedPoints(),
  messages: load(KEY.messages, null) || seedMessages(),
  favorites: load(KEY.favorites, []),
  footprints: load(KEY.footprints, []),
  checkin: load(KEY.checkin, { lastDate: '', streak: 0, totalDays: 0 }),
  member: load(KEY.member, {
    userId: 'u1001', level: 3, levelName: '金卡会员', growthValue: 3200,
    nextLevelGrowth: 5000, points: 168, validDate: F.formatDate(Date.now() + 365 * 86400000),
    discount: 0.92, freeFreightThreshold: 5900
  })
}

function saveCart() { persist(KEY.cart, db.cart) }
function saveOrders() { persist(KEY.orders, db.orders) }
function saveAddresses() { persist(KEY.addresses, db.addresses) }
function saveUserCoupons() { persist(KEY.userCoupons, db.userCoupons) }
function saveReviews() { persist(KEY.reviews, db.reviews) }
function savePoints() { persist(KEY.points, db.pointsRecords) }
function saveMessages() { persist(KEY.messages, db.messages) }
function saveFavorites() { persist(KEY.favorites, db.favorites) }
function saveFootprints() { persist(KEY.footprints, db.footprints) }
function saveCheckin() { persist(KEY.checkin, db.checkin) }
function saveMember() { persist(KEY.member, db.member) }

// ---------- 随机延迟 200~600ms ----------
function delay() {
  var ms = 200 + Math.random() * 400
  return new Promise(function (resolve) { setTimeout(resolve, ms) })
}

// ---------- 工具 ----------
function goodsById(id) {
  id = Number(id)
  for (var i = 0; i < db.goods.length; i++) if (db.goods[i].id === id) return db.goods[i]
  return null
}
function goodsBySku(sku) {
  for (var i = 0; i < db.goods.length; i++) if (db.goods[i].sku === sku) return db.goods[i]
  return db.goods[0]
}

// ============================================================
// API（Promise）
// ============================================================
var api = {
  // ---- 首页 / 商品 ----
  asyncHome: function () {
    return delay().then(function () {
      return {
        banner: [
          { path: itemPic(0), name: '限时抢购 车厘子7折起', link: '/pages/promotion/index?tab=seckill' },
          { path: itemPic(8), name: '贝贝南瓜 粉糯香甜', link: '/pages/detail/detail?id=9' },
          { path: itemPic(14), name: '原切牛排 冷链直达', link: '/pages/detail/detail?id=15' },
          { path: itemPic(20), name: '三文鱼刺身 新鲜到家', link: '/pages/detail/detail?id=21' }
        ],
        categoryAreaV2: {
          lanternArea: CATEGORIES.map(function (c) { return { image: c.icon, name: c.name, type: 'category', link: '/pages/category/index?cat=' + c.id } }),
          tileArea: [
            { image: '/https/images/icons/tag.png', name: '限时秒杀', type: 'active', link: '/pages/promotion/index?tab=seckill' },
            { image: '/https/images/icons/group.png', name: '拼团特惠', type: 'active', link: '/pages/coupon/index?tab=group' },
            { image: '/https/images/icons/money_bag.png', name: '领券中心', type: 'coupon', link: '/pages/promotion/index?tab=coupon' },
            { image: '/https/images/icons/card_bag.png', name: '会员中心', type: 'vip', link: '/pages/vip/vip' }
          ]
        },
        products: db.goods,
        categories: CATEGORIES,
        seckill: db.goods.slice(0, 6).map(function (g) {
          var sp = Math.round(g.minPrice * 0.7)
          return {
            goodsId: g.id, name: g.name, pic: g.pic,
            seckillPrice: sp, seckillPriceYuan: F.fen2yuan(sp),
            originalPriceYuan: F.fen2yuan(g.minPrice),
            soldPercent: 20 + ((g.id * 13) % 60)
          }
        })
      }
    })
  },

  getGoods: function (params) {
    params = params || {}
    return delay().then(function () {
      var list = db.goods.slice()
      if (params.categoryId) list = list.filter(function (g) { return g.categoryId === Number(params.categoryId) })
      if (params.keyword) {
        var kw = String(params.keyword).toLowerCase()
        list = list.filter(function (g) {
          return g.name.toLowerCase().indexOf(kw) >= 0 || g.subtitle.toLowerCase().indexOf(kw) >= 0 || g.categoryName.indexOf(kw) >= 0
        })
      }
      if (params.sort === 'priceAsc') list.sort(function (a, b) { return a.minPrice - b.minPrice })
      else if (params.sort === 'priceDesc') list.sort(function (a, b) { return b.minPrice - a.minPrice })
      else if (params.sort === 'sales') list.sort(function (a, b) { return b.salesVolume - a.salesVolume })
      // 分页：每页10条
      var page = Number(params.page) || 1
      var pageSize = Number(params.pageSize) || 10
      var start = (page - 1) * pageSize
      return {
        list: list.slice(start, start + pageSize),
        total: list.length,
        page: page,
        pageSize: pageSize,
        hasMore: start + pageSize < list.length
      }
    })
  },

  getProductDetail: function (params) {
    return delay().then(function () {
      var g = params && params.sku ? goodsBySku(params.sku) : goodsById(params && params.id)
      if (!g) g = db.goods[0]
      var reviews = db.reviews.filter(function (r) { return r.goodsId === g.id })
      var alsoLike = db.goods.filter(function (x) { return x.categoryId === g.categoryId && x.id !== g.id }).slice(0, 6)
      // 评分汇总
      var avgScore = 4.8
      if (reviews.length) {
        var sum = reviews.reduce(function (s, r) { return s + r.score }, 0)
        avgScore = Math.round(sum / reviews.length * 10) / 10
      }
      return { product: g, reviews: reviews, alsoLike: alsoLike, avgScore: avgScore, reviewCount: reviews.length }
    })
  },

  hotWords: function () {
    return delay().then(function () {
      return {
        data: ['车厘子', '草莓', '牛排', '牛奶', '西瓜', '三文鱼', '每日坚果', '脐橙'],
        like_result: { product_list: db.goods.slice(0, 8) }
      }
    })
  },

  // ---- 购物车 ----
  getCart: function () {
    return delay().then(function () { return db.cart.slice() })
  },

  addToCart: function (item) {
    // item: {goodsId, name, pic, specText, price, count}
    return delay().then(function () {
      var g = goodsById(item.goodsId)
      if (!g) return { ok: false, msg: '商品不存在' }
      var exist = null
      for (var i = 0; i < db.cart.length; i++) {
        if (db.cart[i].goodsId === item.goodsId && db.cart[i].specText === item.specText) { exist = db.cart[i]; break }
      }
      var count = item.count || 1
      if (exist) {
        exist.count = Math.min(exist.count + count, g.stock)
        exist.checked = true
      } else {
        db.cart.push({
          id: Date.now() + '_' + item.goodsId,
          goodsId: g.id, name: g.name, pic: g.pic,
          specText: item.specText || '标准装',
          price: item.price || g.minPrice,
          count: count, checked: true,
          stock: g.stock, invalid: g.stock <= 0
        })
      }
      saveCart()
      return { ok: true, cart: db.cart }
    })
  },

  updateCartCount: function (cartId, count) {
    return delay().then(function () {
      for (var i = 0; i < db.cart.length; i++) {
        if (db.cart[i].id === cartId) {
          var g = goodsById(db.cart[i].goodsId)
          var max = g ? g.stock : db.cart[i].count
          db.cart[i].count = Math.max(0, Math.min(count, max))
          if (db.cart[i].count === 0) db.cart.splice(i, 1)
          break
        }
      }
      saveCart()
      return { ok: true, cart: db.cart }
    })
  },

  removeCartItem: function (cartId) {
    return delay().then(function () {
      db.cart = db.cart.filter(function (c) { return c.id !== cartId })
      saveCart()
      return { ok: true, cart: db.cart }
    })
  },

  clearChecked: function () {
    return delay().then(function () {
      db.cart = db.cart.filter(function (c) { return !c.checked })
      saveCart()
      return { ok: true, cart: db.cart }
    })
  },

  toggleCheck: function (cartId, checked) {
    return delay().then(function () {
      for (var i = 0; i < db.cart.length; i++) {
        if (db.cart[i].id === cartId) db.cart[i].checked = checked
      }
      saveCart()
      return { ok: true, cart: db.cart }
    })
  },

  toggleAll: function (checked) {
    return delay().then(function () {
      db.cart.forEach(function (c) { if (!c.invalid) c.checked = checked })
      saveCart()
      return { ok: true, cart: db.cart }
    })
  },

  // ---- 地址 ----
  getAddresses: function () {
    return delay().then(function () { return db.addresses.slice() })
  },
  saveAddress: function (addr) {
    return delay().then(function () {
      if (addr.id) {
        for (var i = 0; i < db.addresses.length; i++) {
          if (db.addresses[i].id === addr.id) {
            Object.assign(db.addresses[i], addr)
            if (addr.isDefault) db.addresses.forEach(function (a) { a.isDefault = a.id === addr.id })
            break
          }
        }
      } else {
        addr.id = Date.now()
        if (addr.isDefault || db.addresses.length === 0) {
          db.addresses.forEach(function (a) { a.isDefault = false })
          addr.isDefault = true
        }
        db.addresses.push(addr)
      }
      saveAddresses()
      return { ok: true, addresses: db.addresses }
    })
  },
  deleteAddress: function (id) {
    return delay().then(function () {
      db.addresses = db.addresses.filter(function (a) { return a.id !== id })
      saveAddresses()
      return { ok: true, addresses: db.addresses }
    })
  },
  setDefaultAddress: function (id) {
    return delay().then(function () {
      db.addresses.forEach(function (a) { a.isDefault = a.id === id })
      saveAddresses()
      return { ok: true, addresses: db.addresses }
    })
  },

  // ---- 优惠券 ----
  getCouponCenter: function () {
    return delay().then(function () { return db.couponCenter.slice() })
  },
  claimCoupon: function (couponId) {
    return delay().then(function () {
      var c = null
      for (var i = 0; i < db.couponCenter.length; i++) if (db.couponCenter[i].id === couponId) c = db.couponCenter[i]
      if (!c) return { ok: false, msg: '优惠券不存在' }
      if (c.remain <= 0) return { ok: false, msg: '优惠券已领完' }
      // 防重复领取
      var dup = db.userCoupons.find(function (u) { return u.source !== '兑换' && u.name === c.name && u.status === 1 })
      if (dup) return { ok: false, msg: '您已领取过该券' }
      c.remain--
      db.userCoupons.push({
        id: Date.now(), name: c.name, type: c.type, threshold: c.threshold,
        discount: c.discount, scope: c.scope, status: 1,
        expireTime: F.formatDate(Date.now() + c.expireDays * 86400000), source: '领取'
      })
      saveUserCoupons()
      return { ok: true, coupons: db.userCoupons }
    })
  },
  getUserCoupons: function (status) {
    return delay().then(function () {
      var list = db.userCoupons.slice()
      if (status) list = list.filter(function (c) { return c.status === Number(status) })
      return list
    })
  },
  // 计算可用券（商品总价，分）
  usableCoupons: function (totalFen) {
    var list = db.userCoupons.filter(function (c) { return c.status === 1 && c.threshold <= totalFen })
    // 每张券优惠额（分）
    list.forEach(function (c) {
      if (c.type === 1) c.benefit = c.discount * 100 // 满减
      else if (c.type === 3) c.benefit = c.discount * 100 // 无门槛
      else if (c.type === 2) c.benefit = Math.round(totalFen * (1 - c.discount / 100)) // 折扣
    })
    list.sort(function (a, b) { return b.benefit - a.benefit })
    return list
  },

  // ---- 订单 ----
  getOrders: function (params) {
    return delay().then(function () {
      var list = db.orders.slice().sort(function (a, b) { return b.createTime - a.createTime })
      if (params && params.status && params.status !== 'all' && params.status !== 0) {
        list = list.filter(function (o) { return o.status === Number(params.status) })
      }
      var page = Number(params.page) || 1
      var pageSize = Number(params.pageSize) || 10
      var start = (page - 1) * pageSize
      return { list: list.slice(start, start + pageSize), total: list.length, hasMore: start + pageSize < list.length, page: page }
    })
  },
  getOrderDetail: function (id) {
    return delay().then(function () {
      for (var i = 0; i < db.orders.length; i++) if (db.orders[i].id === Number(id)) return db.orders[i]
      return null
    })
  },
  createOrder: function (data) {
    return delay().then(function () {
      var order = {
        id: Date.now(),
        orderNo: F.genOrderNo(),
        status: 2, // 待发货（已支付）
        items: data.items,
        totalAmount: data.totalAmount,
        discountAmount: data.discountAmount,
        fullReduceAmount: data.fullReduceAmount || 0,
        freight: data.freight,
        payAmount: data.payAmount,
        couponId: data.couponId,
        couponTitle: data.couponTitle,
        payType: data.payType || 1,
        remark: data.remark || '',
        deliveryDate: data.deliveryDate || '尽快送达',
        deliverySlot: data.deliverySlot || '尽快送达（预计45分钟）',
        addressSnapshot: data.addressSnapshot,
        rider: null,
        timeline: [
          { time: F.formatTime(Date.now()), status: '已下单', remark: '订单提交成功' },
          { time: F.formatTime(Date.now()), status: '已支付', remark: '演示环境，不产生真实交易；支付成功，仓库分拣中' }
        ],
        isReviewed: false,
        createTime: Date.now()
      }
      db.orders.unshift(order)
      // 使用券置为已使用
      if (data.couponId) {
        db.userCoupons.forEach(function (c) { if (c.id === data.couponId) c.status = 2 })
        saveUserCoupons()
      }
      // 扣库存、清购物车已结算项、加积分
      data.items.forEach(function (it) {
        var g = goodsById(it.goodsId)
        if (g) g.stock = Math.max(0, g.stock - it.count)
      })
      if (data.clearCart === false) {
        // 立即购买：仅移除本次结算项（不影响购物车其他勾选项）
        var settleKeys = {}
        data.items.forEach(function (it) { settleKeys[it.goodsId + '|' + it.specText] = true })
        db.cart = db.cart.filter(function (c) { return !settleKeys[c.goodsId + '|' + c.specText] })
      } else {
        db.cart = db.cart.filter(function (c) { return !c.checked })
      }
      saveCart()
      saveOrders()
      // 购物返积分：实付每100元1积分；成长值：1元=1成长值
      var addPts = Math.max(1, Math.floor(F.toYuan(data.payAmount)))
      db.pointsRecords.unshift({ id: Date.now(), type: 1, points: addPts, desc: '购物消费返积分', createTime: Date.now() })
      db.member.points += addPts
      db.member.growthValue += Math.floor(F.toYuan(data.payAmount))
      savePoints(); saveMember()
      // 生成消息：下单/支付成功
      db.messages.unshift({ id: Date.now(), type: 2, title: '支付成功', content: '订单 ' + order.orderNo + ' 支付成功（实付¥' + F.fen2yuan(data.payAmount) + '），正在为您分拣打包。', isRead: false, createTime: Date.now(), relatedId: order.id })
      saveMessages()
      return { ok: true, order: order }
    })
  },
  cancelOrder: function (id) {
    return delay().then(function () {
      var o = db.orders.find(function (x) { return x.id === Number(id) })
      if (!o) return { ok: false, msg: '订单不存在' }
      if (o.status !== 1) return { ok: false, msg: '仅待付款订单可取消' }
      o.status = 6
      o.timeline.push({ time: F.formatTime(Date.now()), status: '已取消', remark: '用户取消订单' })
      saveOrders()
      return { ok: true, order: o }
    })
  },
  payOrder: function (id) {
    return delay().then(function () {
      var o = db.orders.find(function (x) { return x.id === Number(id) })
      if (!o) return { ok: false, msg: '订单不存在' }
      if (o.status !== 1) return { ok: false, msg: '订单状态不支持支付' }
      o.status = 2
      o.timeline.push({ time: F.formatTime(Date.now()), status: '已支付', remark: '演示环境，不产生真实交易；支付成功' })
      saveOrders()
      return { ok: true, order: o }
    })
  },
  confirmReceive: function (id) {
    return delay().then(function () {
      var o = db.orders.find(function (x) { return x.id === Number(id) })
      if (!o) return { ok: false, msg: '订单不存在' }
      if (o.status !== 4 && o.status !== 3) return { ok: false, msg: '当前状态不可确认收货' }
      o.status = 5
      o.timeline.push({ time: F.formatTime(Date.now()), status: '已送达', remark: '确认收货成功，感谢购买' })
      saveOrders()
      return { ok: true, order: o }
    })
  },

  // ---- 评价 ----
  getReviews: function (goodsId) {
    return delay().then(function () {
      var list = db.reviews.slice()
      if (goodsId) list = list.filter(function (r) { return r.goodsId === Number(goodsId) })
      return list
    })
  },
  submitReview: function (data) {
    return delay().then(function () {
      var review = {
        id: Date.now(), orderId: data.orderId, goodsId: data.goodsId,
        userId: 'u1001', userName: '我', avatar: AVATARS[0],
        score: data.score || 5, tags: data.tags || [], content: data.content || '',
        images: data.images && data.images.length ? data.images : [itemPic(3)],
        createTime: Date.now()
      }
      db.reviews.unshift(review)
      var o = db.orders.find(function (x) { return x.id === Number(data.orderId) })
      if (o) o.isReviewed = true
      // 评价赠20积分 + 20成长值
      db.pointsRecords.unshift({ id: Date.now() + 1, type: 3, points: 20, desc: '商品评价奖励', createTime: Date.now() })
      db.member.points += 20
      db.member.growthValue += 20
      saveReviews(); saveOrders(); savePoints(); saveMember()
      return { ok: true, review: review }
    })
  },

  // ---- 收藏 / 足迹 ----
  getFavorites: function () {
    return delay().then(function () {
      var list = db.favorites.map(function (id) { return goodsById(id) }).filter(Boolean)
      return list
    })
  },
  toggleFavorite: function (goodsId) {
    return delay().then(function () {
      goodsId = Number(goodsId)
      var idx = db.favorites.indexOf(goodsId)
      var isFav = idx < 0
      if (isFav) db.favorites.push(goodsId)
      else db.favorites.splice(idx, 1)
      saveFavorites()
      return { ok: true, isFavorite: isFav }
    })
  },
  getFootprints: function () {
    return delay().then(function () {
      var list = db.footprints.map(function (entry) {
        var gid = typeof entry === 'object' ? entry.goodsId : entry
        var g = goodsById(gid)
        if (!g) return null
        var viewTime = typeof entry === 'object' ? entry.time : Date.now()
        return Object.assign({}, g, { viewTime: viewTime })
      }).filter(Boolean)
      return list
    })
  },
  clearFootprints: function () {
    db.footprints = []
    saveFootprints()
    return delay().then(function () { return { ok: true } })
  },
  clearFavorites: function () {
    db.favorites = []
    saveFavorites()
    return delay().then(function () { return { ok: true } })
  },
  removeFootprint: function (goodsId) {
    goodsId = Number(goodsId)
    db.footprints = db.footprints.filter(function (entry) {
      var gid = typeof entry === 'object' ? entry.goodsId : entry
      return gid !== goodsId
    })
    saveFootprints()
    return delay().then(function () { return { ok: true } })
  },
  addFootprint: function (goodsId) {
    goodsId = Number(goodsId)
    // 统一为对象 {goodsId, time}，去重置顶
    db.footprints = db.footprints.map(function (entry) {
      return typeof entry === 'object' ? entry : { goodsId: entry, time: Date.now() }
    })
    db.footprints = db.footprints.filter(function (entry) { return entry.goodsId !== goodsId })
    db.footprints.unshift({ goodsId: goodsId, time: Date.now() })
    if (db.footprints.length > 30) db.footprints = db.footprints.slice(0, 30)
    saveFootprints()
  },

  // ---- 积分 ----
  getPointsRecords: function () {
    return delay().then(function () { return db.pointsRecords.slice() })
  },
  exchange: function (gift) {
    return delay().then(function () {
      if (db.member.points < gift.points) return { ok: false, msg: '积分不足' }
      db.member.points -= gift.points
      db.pointsRecords.unshift({ id: Date.now(), type: 4, points: -gift.points, desc: '兑换' + gift.name, createTime: Date.now() })
      if (gift.coupon) {
        db.userCoupons.push({
          id: Date.now() + 2, name: gift.coupon.name, type: gift.coupon.type,
          threshold: gift.coupon.threshold, discount: gift.coupon.discount,
          scope: gift.coupon.scope, status: 1,
          expireTime: F.formatDate(Date.now() + 30 * 86400000), source: '积分兑换'
        })
        saveUserCoupons()
      }
      savePoints(); saveMember()
      return { ok: true, member: db.member }
    })
  },

  // ---- 签到（7天梯度奖励 +5/+5/+10/+10/+15/+20/+50）----
  CHECKIN_REWARDS: [5, 5, 10, 10, 15, 20, 50],

  getCheckin: function () {
    return delay().then(function () {
      var today = new Date()
      var y = today.getFullYear(), m = today.getMonth()
      var daysInMonth = new Date(y, m + 1, 0).getDate()
      var monthRecords = db.checkin.monthRecords || []
      var todaySigned = db.checkin.lastDate === F.formatDate(Date.now())
      var streak = db.checkin.streak || 0
      var todayReward = api.CHECKIN_REWARDS[(streak) % 7]
      return {
        streak: streak,
        totalDays: db.checkin.totalDays || 0,
        todaySigned: todaySigned,
        monthRecords: monthRecords,
        daysInMonth: daysInMonth,
        year: y, month: m + 1,
        rewards: api.CHECKIN_REWARDS,
        todayReward: todayReward,
        member: db.member
      }
    })
  },

  checkin: function () {
    return delay().then(function () {
      var today = F.formatDate(Date.now())
      if (db.checkin.lastDate === today) return { ok: false, msg: '今日已签到', checkin: db.checkin }
      var yesterday = F.formatDate(Date.now() - 86400000)
      db.checkin.streak = db.checkin.lastDate === yesterday ? db.checkin.streak + 1 : 1
      db.checkin.lastDate = today
      db.checkin.totalDays = (db.checkin.totalDays || 0) + 1
      // 月历记录
      var day = new Date().getDate()
      db.checkin.monthRecords = db.checkin.monthRecords || []
      if (db.checkin.monthRecords.indexOf(day) < 0) db.checkin.monthRecords.push(day)
      // 梯度积分：连签第 N 天（1起）→ rewards[(N-1)%7]
      var reward = api.CHECKIN_REWARDS[(db.checkin.streak - 1) % 7]
      db.member.points += reward
      db.member.growthValue += 5
      db.pointsRecords.unshift({ id: Date.now() + 3, type: 2, points: reward, desc: '每日签到奖励（连签' + db.checkin.streak + '天）', createTime: Date.now() })
      // 签到成功消息
      db.messages.unshift({ id: Date.now() + 4, type: 1, title: '签到成功', content: '连续签到' + db.checkin.streak + '天，获得' + reward + '积分', isRead: false, createTime: Date.now(), relatedId: null })
      saveCheckin(); savePoints(); saveMember(); saveMessages()
      return { ok: true, reward: reward, checkin: db.checkin, member: db.member }
    })
  },

  // ---- 促销活动：限时抢购 / 满减阶梯 / 领券 ----
  getPromotions: function () {
    return delay().then(function () {
      var now = new Date()
      var hour = now.getHours()
      // 场次：10:00 / 14:00 / 20:00
      var sessions = [
        { sessionId: 1, name: '10:00 场', startHour: 10, endHour: 14, status: hour >= 10 && hour < 14 ? 2 : (hour < 10 ? 1 : 3) },
        { sessionId: 2, name: '14:00 场', startHour: 14, endHour: 20, status: hour >= 14 && hour < 20 ? 2 : (hour < 14 ? 1 : 3) },
        { sessionId: 3, name: '20:00 场', startHour: 20, endHour: 24, status: hour >= 20 ? 2 : 1 }
      ]
      var activeSession = sessions.filter(function (s) { return s.status === 2 })[0] || sessions[0]
      // 抢购商品：取6个，抢购价=7折，库存，已抢进度
      var seckillGoods = db.goods.slice(0, 6).map(function (g, i) {
        var seckillPrice = Math.round(g.minPrice * 0.7)
        var soldPercent = 20 + ((g.id * 13) % 60)
        return {
          goodsId: g.id, name: g.name, pic: g.pic,
          seckillPrice: seckillPrice,
          seckillPriceYuan: F.fen2yuan(seckillPrice),
          originalPrice: g.minPrice,
          originalPriceYuan: F.fen2yuan(g.minPrice),
          stock: g.stock,
          soldPercent: soldPercent
        }
      })
      var fullReduceRules = [
        { threshold: 59, reduce: 8, thresholdFen: 5900, reduceFen: 800 },
        { threshold: 99, reduce: 20, thresholdFen: 9900, reduceFen: 2000 },
        { threshold: 199, reduce: 50, thresholdFen: 19900, reduceFen: 5000 }
      ]
      // 倒计时（距当前场次结束）
      var endTs = new Date(now)
      endTs.setHours(activeSession.endHour === 24 ? 24 : activeSession.endHour, 0, 0, 0)
      var countdownMs = Math.max(0, endTs.getTime() - now.getTime())
      return {
        sessions: sessions,
        activeSession: activeSession,
        seckillGoods: seckillGoods,
        fullReduceRules: fullReduceRules,
        countdownMs: countdownMs,
        couponCenter: db.couponCenter
      }
    })
  },

  // 满减：按商品总价（分）返回最高可享减免（分）
  fullReduce: function (totalFen) {
    var rules = [
      { thresholdFen: 19900, reduceFen: 5000 },
      { thresholdFen: 9900, reduceFen: 2000 },
      { thresholdFen: 5900, reduceFen: 800 }
    ]
    for (var i = 0; i < rules.length; i++) {
      if (totalFen >= rules[i].thresholdFen) return rules[i].reduceFen
    }
    return 0
  },

  // 抢购加购（按抢购价）
  seckillAddToCart: function (goodsId, count) {
    return delay().then(function () {
      var g = goodsById(goodsId)
      if (!g) return { ok: false, msg: '商品不存在' }
      var seckillPrice = Math.round(g.minPrice * 0.7)
      return api.addToCart({ goodsId: g.id, name: g.name, pic: g.pic, specText: '抢购价', price: seckillPrice, count: count || 1 })
    })
  },

  // ---- 订单状态推进（催发货/模拟配送进度）----
  advanceOrder: function (id) {
    return delay().then(function () {
      var o = db.orders.find(function (x) { return x.id === Number(id) })
      if (!o) return { ok: false, msg: '订单不存在' }
      // 2待发货→3配送中（商家发货/骑手取货）；3配送中→4待收货；4待收货→5已完成
      var nextMap = { 2: 3, 3: 4, 4: 5 }
      var remarkMap = {
        2: { status: '商家已发货', remark: '商家已发货，骑手正在取货配送' },
        3: { status: '骑手配送中', remark: '骑手已取货，正在为您配送，请保持电话畅通' },
        4: { status: '已送达', remark: '订单已送达，确认收货后完成' }
      }
      if (!nextMap[o.status]) return { ok: false, msg: '当前状态无需推进', order: o }
      var from = o.status
      o.status = nextMap[from]
      var r = remarkMap[from]
      o.timeline.push({ time: F.formatTime(Date.now()), status: r.status, remark: r.remark })
      if (o.status >= 3 && !o.rider) o.rider = { name: '李骑手', phone: '13900139000', avatar: '/https/images/me-icon/02.png' }
      // 状态流转生成消息
      var msgTitle = from === 2 ? '商家已发货' : (from === 3 ? '骑手配送中' : '订单已送达')
      db.messages.unshift({ id: Date.now() + 5, type: 2, title: msgTitle, content: '订单 ' + o.orderNo + '：' + r.remark, isRead: false, createTime: Date.now(), relatedId: o.id })
      saveOrders(); saveMessages()
      return { ok: true, order: o }
    })
  },

  // ---- 售后退款（已完成订单）----
  refundOrder: function (id, reason) {
    return delay().then(function () {
      var o = db.orders.find(function (x) { return x.id === Number(id) })
      if (!o) return { ok: false, msg: '订单不存在' }
      if (o.aftersale && o.aftersale.status === '退款成功') return { ok: false, msg: '该订单已退款' }
      o.aftersale = {
        reason: reason || '质量问题',
        amount: o.payAmount,
        amountYuan: F.fen2yuan(o.payAmount),
        time: F.formatTime(Date.now()),
        status: '退款成功'
      }
      db.messages.unshift({ id: Date.now() + 6, type: 2, title: '退款成功', content: '订单 ' + o.orderNo + ' 已退款 ¥' + F.fen2yuan(o.payAmount) + '，原路退回', isRead: false, createTime: Date.now(), relatedId: o.id })
      saveOrders(); saveMessages()
      return { ok: true, order: o }
    })
  },

  // ---- 消息：mock 延迟推送（促销提醒）----
  pushSeckillReminder: function () {
    return delay().then(function () {
      // 避免重复推送
      var exist = db.messages.find(function (m) { return m.title === '限时抢购提醒' })
      if (exist) return { ok: true, messages: db.messages }
      db.messages.unshift({
        id: Date.now() + 7, type: 3, title: '限时抢购提醒',
        content: '20:00 场限时抢购即将开始，车厘子7折起，先到先得！',
        isRead: false, createTime: Date.now(), relatedId: { tab: 'seckill' }
      })
      saveMessages()
      return { ok: true, messages: db.messages }
    })
  },

  // ---- 消息 ----
  getMessages: function () {
    return delay().then(function () { return db.messages.slice() })
  },
  readMessage: function (id) {
    return delay().then(function () {
      db.messages.forEach(function (m) { if (m.id === Number(id)) m.isRead = true })
      saveMessages()
      return { ok: true }
    })
  },
  readAllMessages: function () {
    return delay().then(function () {
      db.messages.forEach(function (m) { m.isRead = true })
      saveMessages()
      return { ok: true }
    })
  },

  // ---- 会员 ----
  getMember: function () {
    return delay().then(function () { return db.member })
  },

  // ---- 默认图 / 兜底 ----
  defaultImg: function () { return DEFAULT_IMG }
}

// ============================================================
// 拦截 wx.request：旧页面请求 https://localhost:3001/data/*.json 也能正常返回
// ============================================================
var originalRequest = wx.request
var routed = false
function install() {
  if (routed) return
  routed = true
  wx.request = function (options) {
    var url = options.url || ''
    var data = options.data || {}
    var method = (options.method || 'GET').toUpperCase()
    function done(payload) {
      var ms = 200 + Math.random() * 400
      setTimeout(function () {
        var res = { statusCode: 200, data: payload, errMsg: 'request:ok' }
        try { options.success && options.success(res) } catch (e) { console.error(e) }
        try { options.complete && options.complete(res) } catch (e) {}
      }, ms)
    }
    try {
      if (url.indexOf('data/data.json') >= 0) {
        api.asyncHome().then(done)
      } else if (url.indexOf('data/detail.json') >= 0) {
        api.getProductDetail({ sku: data.sku, id: data.id }).then(function (r) {
          done(Object.assign({}, r.product, { reviews: r.reviews, alsoLike: r.alsoLike, avgScore: r.avgScore, reviewCount: r.reviewCount }))
        })
      } else if (url.indexOf('data/orders.json') >= 0) {
        api.getOrders(data).then(function (r) { done({ errno: 0, data: r.list }) })
      } else if (url.indexOf('data/searchMsg.json') >= 0) {
        api.hotWords().then(done)
      } else if (url.indexOf('data/me.json') >= 0) {
        done({
          member: [],
          list: [
            { icon: '/https/images/icons/shopping.png', name: '我的订单', link: '/pages/order/list' },
            { icon: '/https/images/icons/card_bag.png', name: '优惠券', link: '/pages/coupon/index' },
            { icon: '/https/images/icons/person_active.png', name: '收货地址', link: '/pages/address/list' },
            { icon: '/https/images/icons/tag.png', name: '我的积分', link: '/pages/member/points' }
          ]
        })
      } else if (url.indexOf('data/vip.json') >= 0) {
        api.getMember().then(function (m) {
          done({
            data: [
              { title: '会员权益', items: [{ name: '专属折扣', value: '92折' }, { name: '免配送费门槛', value: '满59元' }, { name: '优先配送', value: '专属通道' }, { name: '生日礼包', value: '每月赠券' }] },
              { title: '会员专享商品', items: db.goods.slice(0, 6) }
            ],
            member: m
          })
        })
      } else {
        // 未知请求也返回空成功，避免白屏报错
        done({ errno: 0, data: {} })
      }
    } catch (e) {
      console.error('mock route error', e)
      done({ errno: 0, data: {} })
    }
  }
}

module.exports = {
  install: install,
  api: api,
  db: db,
  DEFAULT_IMG: DEFAULT_IMG,
  GOODS: GOODS
}
