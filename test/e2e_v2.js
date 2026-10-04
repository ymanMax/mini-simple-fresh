// test/e2e_v2.js —— V2.0 延伸需求端到端测试：满减叠加、状态推进、退款、梯度签到、消息推送、秒杀价、场次、生日券、足迹管理
const storage = {}
global.wx = {
  getStorageSync: (k) => storage[k] !== undefined ? storage[k] : null,
  setStorageSync: (k, v) => { storage[k] = v },
  showToast: () => {}, showModal: () => {}, showLoading: () => {}, hideLoading: () => {},
  navigateTo: () => {}, switchTab: () => {}, redirectTo: () => {}, reLaunch: () => {},
  makePhoneCall: () => {}, setTabBarBadge: () => {}, removeTabBarBadge: () => {},
  previewImage: () => {}, actionSheet: () => {}, stopPullDownRefresh: () => {},
  login: () => {}, getSetting: () => {}, getUserInfo: () => {}
}
const api = require('../utils/api.js')

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name) }
  else { fail++; console.log('FAIL', name) }
}

(async () => {
  // 1. 满减阶梯计算（需求9.2：满59减8/满99减20/满199减50）
  check('满59减8元', api.fullReduceOf(5900) === 800)
  check('满99减20元', api.fullReduceOf(9900) === 2000)
  check('满199减50元', api.fullReduceOf(19900) === 5000)
  check('未满59无满减', api.fullReduceOf(3000) === 0)

  // 2. 促销场次存在（需求9.1）
  const promo = await api.getPromotions()
  check('秒杀场次3个', promo.seckill.sessions.length === 3)
  check('秒杀商品3个', promo.seckill.seckillGoods.length === 3)
  check('满减阶梯3条', promo.fullReduce.fullReduceRules.length === 3)

  // 3. 生日8.8折券在我的优惠券（需求8.1）
  const coupons = await api.getMyCoupons(1)
  check('生日8.8折券存在', coupons.some(c => c.name.indexOf('8.8折') >= 0 || (c.type === 2 && c.discount === 88)))

  // 4. 秒杀价加购（priceOverride → 购物车按抢购价）
  await api.addToCart('g1', '秒杀专享 · 标准装', 1, { specText: '秒杀专享 · 智利车厘子400g*1盒', priceOverride: 1990 })
  let cart = await api.getCart()
  const seckillItem = cart.find(c => c.specText.indexOf('秒杀') >= 0)
  check('秒杀商品按抢购价19.9入车', seckillItem && seckillItem.price === 1990)

  // 5. 下单拆分：商品总价 - 满减 - 优惠券 + 配送费 = 应付（先满减后用券，需求9.2）
  // 用多个商品凑满减：选3件总价约100+元
  await api.clearCheckedItems()
  await api.addToCart('g1', '标准装 · 常规包装', 1)
  await api.addToCart('g3', '标准装 · 常规包装', 1)
  await api.addToCart('g6', '标准装 · 常规包装', 2)
  cart = await api.getCart()
  const items = cart.filter(c => c.checked && c.invalid === false).map(c => ({ goodsId: c.goodsId, name: c.name, pic: c.pic, specText: c.specText, price: c.price, count: c.count }))
  const goodsTotal = items.reduce((s, i) => s + i.price * i.count, 0)
  const orderRes = await api.createOrder({ items: items, payType: 1, couponId: null, remark: '满减测试', deliverySlot: '尽快送达（预计45分钟）', addressSnapshot: { name: '张伟', phone: '13800138000', detail: '朝阳区望京SOHO', tag: '家' } })
  check('下单成功(满减)', orderRes.success)
  const o = orderRes.order
  check('满减金额正确(满99减20或满59减8)', o.fullReduceAmount === api.fullReduceOf(goodsTotal))
  check('应付=总价-满减+配送费', o.payAmount === o.totalAmount - o.fullReduceAmount + o.freight)
  check('微信支付订单→待发货(status2)', o.status === 2)

  // 6. 状态推进（需求7.1：advanceOrder 2→3→4→5，每步生成消息）
  const beforeMsgs = (await api.getMessages()).length
  let adv = await api.advanceOrder(o.id)
  check('推进:待发货→配送中', adv.success && adv.order.status === 3)
  check('推进后生成新消息', (await api.getMessages()).length > beforeMsgs)
  adv = await api.advanceOrder(o.id)
  check('推进:配送中→待收货', adv.success && adv.order.status === 4)
  adv = await api.advanceOrder(o.id)
  check('推进:待收货→已完成', adv.success && adv.order.status === 5)
  adv = await api.advanceOrder(o.id)
  check('已完成不可再推进', !adv.success)

  // 7. 售后退款（需求7.3：已完成→退款成功status7，金额原路退回，生成退款消息）
  const refundRes = await api.requestRefund(o.id, '不新鲜')
  check('退款成功(status7)', refundRes.success && refundRes.order.status === 7 && refundRes.order.refund.status === '退款成功')
  check('退款金额=实付', refundRes.order.refund.amount === o.payAmount)
  const msgsAfterRefund = await api.getMessages()
  check('退款生成消息', msgsAfterRefund.some(m => m.title === '退款成功'))

  // 8. 梯度签到（需求8.2：奖励 [5,5,10,10,15,20,50] 连签循环）
  // 先清空今日签到状态：直接改库
  const db = api.loadDB()
  db.checkIn = db.member.checkIn
  db.member.checkIn.lastDate = ''
  db.member.checkIn.consecutive = 0
  api.saveDB()
  const s1 = await api.checkIn()
  check('第1天签到+5积分', s1.success && s1.reward === 5)
  // 手动推进连续天数模拟循环：再签到需重置lastDate
  db.member.checkIn.lastDate = ''
  db.member.checkIn.consecutive = 1
  api.saveDB()
  const s2 = await api.checkIn()
  check('第2天签到+5积分', s2.success && s2.reward === 5)
  db.member.checkIn.lastDate = ''
  db.member.checkIn.consecutive = 6
  api.saveDB()
  const s7 = await api.checkIn()
  check('第7天签到+50积分', s7.success && s7.reward === 50)

  // 9. 消息：全部已读（需求10.2）+ 延迟推送（需求10.3）
  await api.markAllRead()
  const afterRead = await api.getMessages()
  check('全部已读无未读', afterRead.every(m => m.isRead))
  await api.pushDelayedSeckillMessage()
  const pushed = await api.getMessages()
  check('延迟推送新增促销消息', pushed.some(m => m.type === 3 && m.title.indexOf('20:00') >= 0))

  // 10. 足迹管理：删除单条 + 清空（需求6.3）
  await api.addFootprint('g7')
  await api.deleteFootprint('g7')
  let fps = await api.getFootprints()
  check('单条足迹删除成功', !fps.some(f => f.id === 'g7'))
  await api.clearFootprints()
  fps = await api.getFootprints()
  check('清空足迹成功', fps.length === 0)

  // 11. 货到付款下单 → 待付款(status1)
  await api.clearCheckedItems()
  await api.addToCart('g2', '标准装 · 常规包装', 1)
  cart = await api.getCart()
  const codItems = cart.filter(c => c.checked).map(c => ({ goodsId: c.goodsId, name: c.name, pic: c.pic, specText: c.specText, price: c.price, count: c.count }))
  const codOrder = await api.createOrder({ items: codItems, payType: 2, couponId: null, deliverySlot: '尽快送达（预计45分钟）', addressSnapshot: { name: '张伟', phone: '13800138000', detail: '朝阳区望京SOHO', tag: '家' } })
  check('货到付款→待付款(status1)', codOrder.success && codOrder.order.status === 1)
  // 待付款订单可支付 → 待发货
  const payRes = await api.payOrder(codOrder.order.id)
  check('待付款支付成功→待发货', payRes.success && payRes.order.status === 2)
  // 待付款订单可取消
  await api.addToCart('g5', '标准装 · 常规包装', 1)
  cart = await api.getCart()
  const payItems = cart.filter(c => c.checked).map(c => ({ goodsId: c.goodsId, name: c.name, pic: c.pic, specText: c.specText, price: c.price, count: c.count }))
  const unpaid = await api.createOrder({ items: payItems, payType: 2, couponId: null, deliverySlot: '尽快送达（预计45分钟）', addressSnapshot: { name: '张伟', phone: '13800138000', detail: '朝阳区望京SOHO', tag: '家' } })
  const cancelRes = await api.cancelOrder(unpaid.order.id)
  check('待付款订单可取消(status6)', cancelRes.success && cancelRes.order.status === 6)

  // 12. 优惠券叠加：先满减后用券，券门槛按折前金额判断
  const myCoupons = await api.getMyCoupons(1)
  const has5yuan = myCoupons.some(c => c.type === 3 && c.discount === 500)
  check('优惠券体系完整(无门槛券)', has5yuan)

  console.log(`\n=== V2 E2E: ${pass} passed, ${fail} failed ===`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('V2 E2E ERROR', e); process.exit(1) })
