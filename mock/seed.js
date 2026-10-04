// mock/seed.js —— 种子数据：40+商品、8分类、banner、订单、评价、优惠券、地址、消息、积分、会员、VIP
// 所有金额单位为「分」，前端通过 utils/format.js 转换为元
// 所有图片均为本地资源，避免 CDN 失效裂图

var IMG = function (n) { return '/images/item/' + (n < 10 ? '0' + n : n) + '.jpg' }
var ICON = function (n) { return '/images/icons/' + n + '.png' }

// ---------- 分类 ----------
var categories = [
  { id: 'fruit', name: '水果', icon: ICON('see') },
  { id: 'veg', name: '蔬菜', icon: ICON('community') },
  { id: 'meat', name: '肉类', icon: ICON('card_bag') },
  { id: 'seafood', name: '水产', icon: ICON('shopping') },
  { id: 'dairy', name: '乳品', icon: ICON('tag') },
  { id: 'snack', name: '零食', icon: ICON('game') },
  { id: 'drink', name: '饮品', icon: ICON('qrcode') },
  { id: 'daily', name: '日用', icon: ICON('menu_settings') }
]

// ---------- 商品基础信息（40条，8分类×5） ----------
// [分类, 名称, 副标题, 产地, 单位, 原价(分), 会员价(分), 销量, 库存, 标签]
var rawGoods = [
  // 水果
  ['fruit', '智利车厘子400g*1盒', 'J级大果 脆甜多汁 空运直达', '智利', '盒', 3990, 2990, 193171, 31, ['顺丰包邮', '当季现摘', '坏果包赔']],
  ['fruit', '云南阳光玫瑰葡萄500g*1盒', '无籽晴王 香甜爆汁', '云南', '盒', 2590, 1890, 86420, 45, ['产地直发', '当季现摘']],
  ['fruit', '南非西柚220-300g*2个', '甜味情话 I want two 西柚', '南非', '2个', 2990, 890, 193171, 36, ['富含维C', '坏果包赔']],
  ['fruit', '海南贵妃芒果1斤*1袋', '树上熟 核薄肉厚 香甜软糯', '海南', '斤', 1590, 1190, 65330, 52, ['产地直发', '当季现摘']],
  ['fruit', '新疆无籽露葡萄500g*1盒', '无籽水晶葡萄 清甜爽口', '新疆', '盒', 1990, 1490, 52108, 55, ['产地直发', '坏果包赔']],
  // 蔬菜
  ['veg', '山东西红柿500g*1份', '沙瓤自然熟 番茄味浓', '山东', '份', 690, 490, 44210, 80, ['产地直发', '无农残检测']],
  ['veg', '云南生菜300g*1份', '新鲜嫩叶 脆嫩清爽', '云南', '份', 490, 350, 28760, 64, ['产地直发']],
  ['veg', '新鲜西兰花400g*1颗', '翠绿紧实 营养丰富', '云南', '颗', 790, 550, 33420, 58, ['无农残检测', '坏果包赔']],
  ['veg', '有机黄瓜500g*1份', '清脆爽口 有机种植', '山东', '份', 890, 650, 19870, 70, ['有机认证', '产地直发']],
  ['veg', '北京水萝卜300g*1份', '清脆多汁 凉拌佳品', '北京', '份', 590, 420, 15230, 66, ['当日新鲜']],
  // 肉类
  ['meat', '华正精制猪肋排500g', '冷鲜直供 骨小肉多', '北京', '500g', 2490, 1890, 21560, 40, ['冷鲜直送', '检疫合格']],
  ['meat', '冷鲜鸡胸肉500g', '高蛋白 健身轻食首选', '山东', '500g', 1390, 990, 38420, 48, ['冷鲜直送']],
  ['meat', '肥牛卷300g*1盒', '原切雪花 火锅必备', '内蒙古', '盒', 2290, 1690, 27650, 36, ['原切', '冷链直达']],
  ['meat', '黑猪肉梅花肉400g', '谷饲黑猪 肉质鲜嫩', '浙江', '400g', 2890, 2190, 12430, 28, ['黑猪', '冷鲜直送']],
  ['meat', '鸭腿2个*400g', '肉质紧实 卤味佳品', '北京', '400g', 1690, 1290, 18740, 42, ['检疫合格']],
  // 水产
  ['seafood', '波士顿龙虾500g*1只', '鲜活到家 肉质弹嫩', '加拿大', '只', 12900, 10900, 8920, 12, ['鲜活送达', '顺丰包邮']],
  ['seafood', '鲜活基围虾500g', '白灼鲜甜 活虾速运', '广东', '500g', 3590, 2890, 15630, 25, ['鲜活送达', '冷链直达']],
  ['seafood', '三文鱼刺身200g*1盒', '挪威进口 深海脂润', '挪威', '盒', 4590, 3690, 11240, 18, ['冷链直达', '进口']],
  ['seafood', '鲍鱼6头*1份', '鲜活鲍 肥美多汁', '福建', '6头', 3990, 3190, 7830, 22, ['鲜活送达', '产地直发']],
  ['seafood', '黄花鱼400g*1条', '深海野生 鲜嫩少刺', '山东', '条', 2690, 2090, 13450, 30, ['冷链直达']],
  // 乳品
  ['dairy', '原味酸奶100g*4杯', '生牛乳发酵 浓稠丝滑', '内蒙古', '组', 1290, 990, 42310, 55, ['冷链直达', '无添加']],
  ['dairy', '鲜牛奶950ml*1瓶', '当日鲜奶 巴氏杀菌', '北京', '瓶', 1590, 1190, 31200, 38, ['当日鲜奶', '冷链直达']],
  ['dairy', '芝士蛋糕1份', '轻乳酪 绵密细腻', '北京', '份', 1990, 1590, 12870, 16, ['冷链直达']],
  ['dairy', '奶酪棒20g*8支', '儿童高钙 营养零食', '内蒙古', '袋', 1490, 1190, 25640, 44, ['高钙']],
  ['dairy', '椰奶245ml*6罐', '鲜椰压榨 香浓顺滑', '海南', '组', 1890, 1490, 18930, 50, ['植物蛋白']],
  // 零食
  ['snack', '每日坚果30g*7包', '7种坚果 均衡配比', '新疆', '盒', 2190, 1690, 33450, 60, ['独立包装']],
  ['snack', '芒果干100g*1袋', '厚切大芒果 酸甜Q弹', '广西', '袋', 1290, 990, 45210, 72, ['当季现摘']],
  ['snack', '海苔脆片40g*1盒', '原味紫菜 酥脆鲜香', '江苏', '盒', 990, 790, 28760, 68, ['儿童喜爱']],
  ['snack', '牛肉干80g*1袋', '手撕风干 肉香浓郁', '内蒙古', '袋', 1990, 1490, 19870, 48, ['原切']],
  ['snack', '薯片104g*1桶', '经典原味 咔嚓酥脆', '北京', '桶', 890, 690, 52130, 80, ['膨化食品']],
  // 饮品
  ['drink', '鲜榨橙汁300ml', '100%鲜榨 无添加', '海南', '杯', 1290, 990, 28760, 30, ['当日鲜榨', '冷链直达']],
  ['drink', '气泡水330ml*6瓶', '白桃味 0糖0卡', '广东', '组', 1990, 1490, 21540, 55, ['0糖0卡']],
  ['drink', '美式咖啡250ml', '现磨浓缩 香醇提神', '北京', '杯', 1590, 1290, 17630, 24, ['当日现磨']],
  ['drink', '柠檬茶500ml*1瓶', '手打柠檬 清爽解腻', '广东', '瓶', 990, 790, 33420, 40, ['当日鲜制']],
  ['drink', '乌龙茶500ml*1瓶', '原叶萃取 回甘持久', '福建', '瓶', 890, 690, 27650, 46, ['无糖']],
  // 日用
  ['daily', '抽纸120抽*6包', '原生木浆 柔韧亲肤', '河北', '提', 1590, 1290, 18930, 100, ['包邮']],
  ['daily', '洗衣液2kg*1瓶', '深层洁净 留香持久', '广东', '瓶', 2590, 1990, 12450, 60, ['包邮']],
  ['daily', '保鲜袋100只*1卷', '加厚防漏 食品级', '浙江', '卷', 790, 590, 21560, 90, ['食品级']],
  ['daily', '一次性手套50只*1盒', '加厚TPE 厨房防护', '广东', '盒', 990, 790, 15630, 85, ['食品级']],
  ['daily', '厨房湿巾80抽*1包', '去油污 一擦净', '上海', '包', 1190, 890, 13450, 75, ['包邮']]
]

// ---------- 构造商品 ----------
function buildGoods() {
  var list = []
  for (var i = 0; i < rawGoods.length; i++) {
    var r = rawGoods[i]
    var imgNo = (i % 20) + 1
    var cat = categories.filter(function (c) { return c.id === r[0] })[0]
    var pics = [IMG(imgNo), IMG(((imgNo + 1) % 20) + 1), IMG(((imgNo + 2) % 20) + 1), IMG(((imgNo + 3) % 20) + 1)]
    list.push({
      id: 'g' + (i + 1),
      sku: 'p-' + (1000 + i) + '-fl',
      name: r[1],
      subtitle: r[2],
      pic: IMG(imgNo),
      images: pics,
      detailImages: [IMG(imgNo), IMG(((imgNo + 4) % 20) + 1), IMG(((imgNo + 5) % 20) + 1)],
      categoryId: r[0],
      categoryName: cat.name,
      minPrice: r[6],
      originalPrice: r[5],    // 划线原价（分）
      price: r[6],           // 销售价（分）
      vipPrice: Math.round(r[6] * 0.85), // 会员价：销售价85折（分），始终低于销售价
      numberSells: r[7],
      stock: r[8],
      unit: r[4],
      origin: r[3],
      tags: r[9],
      description: r[2] + '。严选品质，新鲜直达，坏果包赔，安心食用。',
      viewCount: Math.round(r[7] * 1.8),
      collectCount: Math.round(r[7] / 12),
      isCollect: false,
      hot: i < 10,
      hotScore: r[7],
      specs: [
        {
          name: '规格',
          values: [
            { label: '标准装', price: r[6], stock: r[8] },
            { label: '精选装', price: r[6] + 300, stock: Math.max(0, r[8] - 10) },
            { label: '礼盒装', price: r[6] + 800, stock: Math.max(0, r[8] - 20) }
          ]
        },
        {
          name: '包装',
          values: [
            { label: '常规包装', price: 0, stock: r[8] },
            { label: '保鲜礼盒', price: 500, stock: Math.max(0, r[8] - 5) }
          ]
        }
      ]
    })
  }
  return list
}

// ---------- Banner ----------
var banners = [
  { id: 'b1', path: IMG(5), name: '当季鲜果 新鲜直达', link: '', wxapp_show: 1, width: 750, height: 300 },
  { id: 'b2', path: IMG(12), name: '水产海鲜 鲜活到家', link: '', wxapp_show: 1, width: 750, height: 300 },
  { id: 'b3', path: IMG(8), name: '会员专享 低至8.5折', link: '/pages/vip/vip', wxapp_show: 1, width: 750, height: 300 },
  { id: 'b4', path: IMG(15), name: '满59免配送费 · 满减专区', link: '/pages/promotion/index?tab=fullreduce', wxapp_show: 1, width: 750, height: 300 },
  { id: 'b5', path: IMG(18), name: '限时秒杀 每日10点', link: '/pages/promotion/index?tab=seckill', wxapp_show: 1, width: 750, height: 300 }
]

// ---------- 金刚区 ----------
var lanternArea = [
  { image: ICON('group'), name: '限时抢购', type: 'WEBPROMOTION', link: '/pages/promotion/index?tab=seckill', ordering: 1 },
  { image: ICON('money_bag'), name: '领券中心', type: 'WEBPROMOTION', link: '/pages/coupon/index', ordering: 2 },
  { image: ICON('card_bag'), name: '会员专享', type: 'WEBPROMOTION', link: '/pages/vip/vip', ordering: 3 },
  { image: ICON('scan_code'), name: '每日签到', type: 'WEBPROMOTION', link: '/pages/member/checkin', ordering: 4 },
  { image: ICON('like'), name: '我的收藏', type: 'WEBPROMOTION', link: '/pages/my/collect', ordering: 5 }
]
var tileArea = [
  { image: ICON('tag'), name: '生鲜直达', type: 'WEBPROMOTION', link: '/pages/category/index', ordering: 1 },
  { image: ICON('shopping'), name: '热销榜单', type: 'WEBPROMOTION', link: '/pages/index/index', ordering: 2 }
]

// ---------- 搜索 ----------
var hotWords = ['草莓', '车厘子', '西红柿', '酸奶', '猪肋排', '基围虾', '每日坚果', '鲜牛奶', '气泡水', '抽纸']

// ---------- 优惠券 ----------
var couponCenter = [
  { id: 'c1', name: '满59减8元', type: 1, threshold: 5900, discount: 800, scope: '全场', status: 1, expireTime: '2026-12-31 23:59', source: '领取', total: 500, remain: 120 },
  { id: 'c2', name: '满99减20元', type: 1, threshold: 9900, discount: 2000, scope: '全场', status: 1, expireTime: '2026-12-31 23:59', source: '领取', total: 300, remain: 86 },
  { id: 'c3', name: '满199减50元', type: 1, threshold: 19900, discount: 5000, scope: '全场', status: 1, expireTime: '2026-12-31 23:59', source: '领取', total: 200, remain: 45 },
  { id: 'c4', name: '新人无门槛5元', type: 3, threshold: 0, discount: 500, scope: '全场', status: 1, expireTime: '2026-11-30 23:59', source: '领取', total: 1000, remain: 320 },
  { id: 'c5', name: '水果专享满39减6', type: 1, threshold: 3900, discount: 600, scope: '限水果品类', status: 1, expireTime: '2026-11-30 23:59', source: '领取', total: 400, remain: 210 },
  { id: 'c6', name: '全场8.8折券', type: 2, threshold: 5000, discount: 88, scope: '全场', status: 1, expireTime: '2026-12-31 23:59', source: '领取', total: 150, remain: 60 }
]

// ---------- 收货地址 ----------
var addresses = [
  { id: 'a1', name: '张伟', phone: '13800138000', province: '北京市', city: '北京市', district: '朝阳区', detail: '望京街道望京SOHO T1座 1508室', tag: '家', isDefault: true, distanceKm: 3.2 },
  { id: 'a2', name: '张伟', phone: '13800138000', province: '北京市', city: '北京市', district: '海淀区', detail: '中关村大街互联网中心B座 806室', tag: '公司', isDefault: false, distanceKm: 8.5 }
]

// ---------- 订单 ----------
function buildOrders(goods) {
  function pick(ids) {
    return ids.map(function (id) {
      var g = goods.filter(function (x) { return x.id === id })[0]
      return {
        goodsId: g.id, name: g.name, pic: g.pic,
        specText: '标准装 · 常规包装', price: g.price, count: 1, vipPrice: g.vipPrice
      }
    })
  }
  var now = Date.now()
  function daysAgo(n, h) { var d = new Date(now - n * 86400000 - (h || 0) * 3600000); return formatDate(d) }
  function formatDate(d) {
    function p(x) { return x < 10 ? '0' + x : x }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  }
  var def = [
    // [status, items ids, counts, createOffsetDays, payType, isReviewed, couponId]
    [1, ['g1', 'g6'], [1, 2], 0.1, 1, false, null],                 // 待付款
    [2, ['g3', 'g11'], [1, 1], 1.1, 1, false, 'c4'],               // 待发货
    [3, ['g7', 'g16', 'g21'], [1, 1, 2], 2.1, 1, false, 'c1'],    // 配送中
    [4, ['g5', 'g25'], [1, 1], 3.2, 2, false, null],              // 待收货
    [5, ['g2', 'g12'], [2, 1], 5.3, 1, true, 'c1'],                // 已完成·已评价
    [5, ['g4', 'g20', 'g31'], [1, 1, 1], 7.4, 1, true, 'c2'],      // 已完成·已评价
    [5, ['g8', 'g27'], [1, 1], 9.5, 1, true, null],               // 已完成·已评价
    [5, ['g15', 'g33'], [1, 2], 11.6, 2, true, 'c4'],             // 已完成·已评价
    [6, ['g18'], [1], 12.2, 1, false, null],                       // 已取消
    [2, ['g13', 'g22'], [1, 1], 0.6, 1, false, null],             // 待发货
    [3, ['g9', 'g30'], [1, 1], 1.8, 1, false, 'c5'],             // 配送中
    [5, ['g36', 'g38'], [1, 1], 14.7, 1, true, 'c2']              // 已完成·已评价
  ]
  var list = def.map(function (d, idx) {
    var items = pick(d[1])
    items.forEach(function (it, i) { it.count = d[2][i] })
    var goodsTotal = items.reduce(function (s, it) { return s + it.price * it.count }, 0)
    var discount = d[6] ? (d[6] === 'c1' ? 800 : d[6] === 'c2' ? 2000 : d[6] === 'c4' ? 500 : d[6] === 'c5' ? 600 : 0) : 0
    var freight = goodsTotal - discount >= 5900 ? 0 : 600
    var payAmount = goodsTotal - discount + freight
    var orderNo = 'FL' + (20261004000 + idx) + (idx + 1)
    return {
      id: 'o' + (idx + 1),
      orderNo: orderNo,
      status: d[0],
      items: items,
      totalAmount: goodsTotal,
      fullReduceAmount: 0,
      couponDiscount: discount,
      discountAmount: discount,
      freight: freight,
      payAmount: payAmount,
      couponId: d[6],
      couponTitle: d[6] ? couponCenter.filter(function (c) { return c.id === d[6] })[0].name : '',
      payType: d[3] === 2 ? 2 : 1,
      payTypeName: d[3] === 2 ? '货到付款' : '微信支付',
      remark: '',
      deliveryDate: d[0] >= 3 ? '今天 14:00-16:00' : '尽快送达（预计45分钟）',
      deliverySlot: d[0] >= 3 ? '今天 14:00-16:00' : '尽快送达（预计45分钟）',
      addressSnapshot: { name: addresses[0].name, phone: addresses[0].phone, detail: addresses[0].province + addresses[0].city + addresses[0].district + addresses[0].detail, tag: addresses[0].tag },
      rider: d[0] >= 3 ? { name: '李师傅', phone: '13900139000' } : null,
      isReviewed: d[4],
      createTime: daysAgo(Math.floor(d[3]), Math.round((d[3] % 1) * 24))
    }
  })
  // timeline
  list.forEach(function (o) {
    var tl = [
      { time: o.createTime, status: '下单成功', remark: '订单已提交，等待支付' },
      { time: shift(o.createTime, 20), status: '支付成功', remark: o.payTypeName + '支付 ' + (o.payAmount / 100).toFixed(2) + ' 元' },
      { time: shift(o.createTime, 60), status: '商家分拣', remark: '商品正在分拣打包' },
      { time: shift(o.createTime, 120), status: '骑手取货', remark: '骑手已取货，正在配送' },
      { time: shift(o.createTime, 180), status: '送达完成', remark: '订单已完成，感谢惠顾' }
    ]
    var stage = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 0 }[o.status]
    o.timeline = tl.slice(0, stage === 0 ? 1 : stage)
    if (o.status === 6) {
      o.timeline = [{ time: o.createTime, status: '订单已取消', remark: '用户取消订单，退款将原路返回' }]
    }
  })
  return list
}
function shift(t, mins) {
  var d = new Date(new Date(t.replace(/-/g, '/')).getTime() + mins * 60000)
  function p(x) { return x < 10 ? '0' + x : x }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

// ---------- 商品评价 ----------
function buildReviews(goods) {
  var avatars = [ICON('person_active'), ICON('person_normal'), ICON('friends_active'), ICON('smile'), ICON('new_friends')]
  var names = ['美食家小王', '新鲜达人', '吃货本货', '宝妈一枚', '健身餐代表', '甜食爱好者', '厨房小白', '品质生活家']
  var contents = [
    '很新鲜，包装严实，快递小哥态度好，会回购！',
    '个头很大，口感甜，产地直发果然不一样，坏果包赔放心。',
    '第二次买了，品质稳定，配送快，45分钟就到了。',
    '性价比高，会员价很划算，已经推荐给朋友了。',
    '日期新鲜，冷链到位，收到还是冰的，满意。',
    '包装精致，送礼有面子，家人都说好吃。'
  ]
  var tagsPool = ['新鲜', '口感甜', '包装好', '个头大', '配送快', '性价比高', '坏果包赔', '当日鲜']
  var list = []
  var productIds = ['g1', 'g2', 'g3', 'g5', 'g6', 'g11', 'g16', 'g21', 'g25', 'g31']
  productIds.forEach(function (pid, i) {
    var g = goods.filter(function (x) { return x.id === pid })[0]
    var count = 1 + (i % 3)
    for (var k = 0; k < count; k++) {
      list.push({
        id: 'r' + (list.length + 1),
        orderId: 'o' + ((i % 8) + 1),
        goodsId: pid,
        userId: 'u' + i,
        userName: names[(i + k) % names.length],
        avatar: avatars[(i + k) % avatars.length],
        score: 5 - (k % 2),
        tags: tagsPool.slice((i + k) % 4, (i + k) % 4 + 3),
        content: contents[(i + k) % contents.length],
        images: [g.pic, g.images[1]],
        createTime: '2026-09-' + (20 + ((i + k) % 8)) + ' 1' + (i % 4) + ':30'
      })
    }
  })
  return list
}

// ---------- 消息 ----------
var messages = [
  { id: 'm1', type: 1, title: '欢迎使用每日优鲜', content: '新用户注册成功，已赠送5元无门槛券，全场满59免配送费。', isRead: true, createTime: '2026-10-01 09:00', relatedId: '' },
  { id: 'm2', type: 2, title: '订单配送提醒', content: '您的订单 FL20261004001 正在配送中，骑手李师傅 13900139000 将为您送达。', isRead: false, createTime: '2026-10-04 10:20', relatedId: 'o3' },
  { id: 'm3', type: 3, title: '限时秒杀', content: '每日10点限时秒杀，车厘子低至19.9元起，先到先得。', isRead: false, createTime: '2026-10-04 08:00', relatedId: '' },
  { id: 'm4', type: 4, title: '评价有礼', content: '完成商品评价可获20积分，积分可兑换优惠券和好礼。', isRead: false, createTime: '2026-10-03 15:00', relatedId: '' },
  { id: 'm5', type: 3, title: '会员专享日', content: '每周三会员专享日，会员价再享95折，立即开通更划算。', isRead: true, createTime: '2026-10-02 10:00', relatedId: '' },
  { id: 'm6', type: 2, title: '订单已完成', content: '您的订单 FL20260924005 已送达，期待您的评价。', isRead: true, createTime: '2026-09-25 12:00', relatedId: 'o5' }
]

// ---------- 积分记录 ----------
var pointsRecords = [
  { id: 'p1', type: 2, points: 10, desc: '每日签到', createTime: '2026-10-04 08:00' },
  { id: 'p2', type: 1, points: 120, desc: '购物消费 实付129.9元', createTime: '2026-09-25 12:30' },
  { id: 'p3', type: 3, points: 20, desc: '商品评价', createTime: '2026-09-25 13:00' },
  { id: 'p4', type: 5, points: 50, desc: '生日礼包赠送', createTime: '2026-09-10 00:01' },
  { id: 'p5', type: 4, points: -100, desc: '兑换5元无门槛券', createTime: '2026-09-08 10:00' },
  { id: 'p6', type: 1, points: 80, desc: '购物消费 实付89.9元', createTime: '2026-09-05 18:20' },
  { id: 'p7', type: 2, points: 10, desc: '每日签到', createTime: '2026-09-04 08:00' },
  { id: 'p8', type: 1, points: 60, desc: '购物消费 实付59.9元', createTime: '2026-08-30 12:10' }
]

// ---------- 会员 ----------
var member = {
  userId: 'u1001',
  nickName: '鲜生活家',
  avatar: ICON('person_active'),
  level: 2,
  levelName: '银卡会员',
  growthValue: 1280,
  nextLevelGrowth: 2000,
  points: 320,
  validDate: '2027-10-01',
  checkIn: { lastDate: '2026-10-03', consecutive: 3, monthRecords: ['2026-10-01', '2026-10-02', '2026-10-03'] },
  privileges: [
    { name: '专属折扣 98折', desc: '银卡会员全场98折' },
    { name: '生日礼包', desc: '生日月赠送50积分' },
    { name: '免配送费门槛', desc: '满39元免基础配送费' },
    { name: '优先配送', desc: '高峰时段优先安排' },
    { name: '专属客服', desc: '7×24小时在线客服' },
    { name: '每月赠券', desc: '每月5日发放会员专属券' }
  ]
}

// ---------- VIP 页数据 ----------
function buildVipData(goods) {
  var benefits = [
    { id: '001', name: '购物返现5%', primaryName: '购物返现', descSelectIcon: ICON('money_bag') },
    { id: '002', name: '会员专享价', primaryName: '会员专享价', descSelectIcon: ICON('card_bag') },
    { id: '003', name: '1小时送达', primaryName: '1小时送达', descSelectIcon: ICON('shopping') },
    { id: '004', name: '专属红包', primaryName: '专属红包', descSelectIcon: ICON('tag') },
    { id: '005', name: '专属客服', primaryName: '专属客服', descSelectIcon: ICON('smile') }
  ]
  var redbag = [
    { id: 'rb1', name: '5元无门槛券', src: ICON('money_bag'), got: false },
    { id: 'rb2', name: '满59减8券', src: ICON('tag'), got: false },
    { id: 'rb3', name: '水果专享6元券', src: ICON('like'), got: false }
  ]
  var vipProducts = goods.filter(function (g, i) { return [0, 1, 2, 4, 5, 10, 15, 20, 24, 30].indexOf(i) >= 0 }).map(function (g) {
    return { id: g.id, img: g.pic, text: g.name, subtext: g.subtitle, originPrice: g.originalPrice, vipPrice: g.vipPrice, arrive: '2小时达' }
  })
  return { data: [{ id: '01', text: 'icons', data: benefits }, { id: '02', text: 'redbag', data: redbag }, { id: '03', text: 'products', data: vipProducts }] }
}

// ---------- 促销/秒杀/拼团 ----------
function buildPromotions(goods) {
  return {
    seckill: {
      id: 'pk1', type: 1, title: '限时抢购', startTime: '10:00', endTime: '20:00',
      sessions: [
        { sessionId: 's10', name: '10:00 场', startTime: '10:00', endTime: '12:00', status: 3 },
        { sessionId: 's14', name: '14:00 场', startTime: '14:00', endTime: '16:00', status: 1 },
        { sessionId: 's20', name: '20:00 场', startTime: '20:00', endTime: '22:00', status: 1 }
      ],
      seckillGoods: [
        { goodsId: 'g1', seckillPrice: 1990, stock: 50, soldPercent: 80 },
        { goodsId: 'g3', seckillPrice: 690, stock: 80, soldPercent: 60 },
        { goodsId: 'g6', seckillPrice: 490, stock: 100, soldPercent: 45 }
      ]
    },
    fullReduce: {
      id: 'fr1', type: 2, title: '阶梯满减',
      fullReduceRules: [{ threshold: 5900, reduce: 800 }, { threshold: 9900, reduce: 2000 }, { threshold: 19900, reduce: 5000 }]
    },
    groupBuy: [
      { id: 'gb1', goodsId: 'g2', name: '云南阳光玫瑰葡萄500g', pic: goods.filter(function (g) { return g.id === 'g2' })[0].pic, groupPrice: 1590, originalPrice: 2590, requiredCount: 3, joinedCount: 2, status: 1, members: [{ avatar: ICON('friends_active'), name: '吃货小队', isLeader: true }, { avatar: ICON('smile'), name: '新鲜达人', isLeader: false }], endTime: '12:30:00', rules: '3人成团，24小时未成团自动退款' },
      { id: 'gb2', goodsId: 'g7', name: '新鲜西兰花400g*1颗', pic: goods.filter(function (g) { return g.id === 'g7' })[0].pic, groupPrice: 550, originalPrice: 790, requiredCount: 2, joinedCount: 1, status: 1, members: [{ avatar: ICON('person_active'), name: '厨房小白', isLeader: true }], endTime: '08:45:00', rules: '2人成团，24小时未成团自动退款' }
    ]
  }
}

// ---------- 组装 ----------
function buildSeed() {
  var goods = buildGoods()
  return {
    categories: categories,
    banners: banners,
    lanternArea: lanternArea,
    tileArea: tileArea,
    goods: goods,
    hotWords: hotWords,
    couponCenter: couponCenter,
    myCoupons: [
      { id: 'mc1', name: '满59减8元', type: 1, threshold: 5900, discount: 800, scope: '全场', status: 1, expireTime: '2026-12-31 23:59', source: '领取' },
      { id: 'mc2', name: '新人无门槛5元', type: 3, threshold: 0, discount: 500, scope: '全场', status: 1, expireTime: '2026-11-30 23:59', source: '生日赠送' },
      { id: 'mc3', name: '满99减20元', type: 1, threshold: 9900, discount: 2000, scope: '全场', status: 2, expireTime: '2026-10-01 23:59', source: '领取', usedTime: '2026-09-25 12:30' },
      { id: 'mc4', name: '水果专享满39减6', type: 1, threshold: 3900, discount: 600, scope: '限水果品类', status: 3, expireTime: '2026-09-01 23:59', source: '领取' },
      { id: 'mc5', name: '生日8.8折券', type: 2, threshold: 5000, discount: 88, scope: '全场', status: 1, expireTime: '2026-11-30 23:59', source: '生日赠送' }
    ],
    addresses: addresses,
    orders: buildOrders(goods),
    reviews: buildReviews(goods),
    messages: messages,
    pointsRecords: pointsRecords,
    member: member,
    vip: buildVipData(goods),
    promotions: buildPromotions(goods),
    cart: [],
    favorites: [
      { goodsId: 'g1', createTime: '2026-10-02 10:00' },
      { goodsId: 'g3', createTime: '2026-10-02 11:30' },
      { goodsId: 'g2', createTime: '2026-10-03 09:15' }
    ],
    footprints: [
      { goodsId: 'g6', time: '2026-10-04 09:30' },
      { goodsId: 'g11', time: '2026-10-04 10:15' },
      { goodsId: 'g16', time: '2026-10-03 16:20' },
      { goodsId: 'g21', time: '2026-10-03 14:00' },
      { goodsId: 'g3', time: '2026-10-02 11:30' }
    ],
    history: ['车厘子', '西红柿', '酸奶']
  }
}

module.exports = { buildSeed: buildSeed, IMG: IMG, ICON: ICON }
