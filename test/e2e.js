// test/e2e.js —— 完整业务流程测试：加购→下单→支付→评价→签到→领券→兑换→地址→消息→收藏
const storage = {}
global.wx = {
  getStorageSync: (k) => storage[k] !== undefined ? storage[k] : null,
  setStorageSync: (k, v) => { storage[k] = v },
  showToast: () => {}, showModal: () => {}, showLoading: () => {}, hideLoading: () => {}
}
const api = require('../utils/api.js')

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name) }
  else { fail++; console.log('FAIL', name) }
}

(async () => {
  // 1. 商品/分类/搜索
  const cats = await api.getCategories()
  check('8个分类', cats.length === 8)
  check('分类商品总数=40', cats.reduce((s, c) => s + c.count, 0) === 40)
  const pg = await api.getProducts({ page: 1, pageSize: 10, keyword: '西柚' })
  check('搜索"西柚"有结果', pg.list.some(g => g.name.indexOf('西柚') >= 0) && pg.total >= 1)
  const sorted = await api.getProducts({ sort: 'priceAsc', pageSize: 40 })
  check('价格升序排序', sorted.list.every((g, i, arr) => i === 0 || arr[i - 1].price <= g.price))

  // 2. 商品详情
  const det = await api.getProductDetail('g1')
  check('详情含评价与推荐', det.product && det.reviews.length >= 0 && det.recommend.length >= 4)
  check('详情商品价为分整数', Number.isInteger(det.product.price) && det.product.vipPrice < det.product.price)

  // 3. 加购
  await api.addToCart('g1', '标准装 · 常规包装', 2)
  await api.addToCart('g3', '精选装 · 常规包装', 1)
  let cart = await api.getCart()
  check('购物车2件商品', cart.length === 2)
  check('购物车总数=3', api.cartCount() === 3)

  // 4. 优惠券（最优券自动选中逻辑在页面层；store层验证券可用）
  const coupons = await api.getMyCoupons(1)
  check('我的未使用券>=2', coupons.length >= 2)

  // 5. 下单（微信支付）
  const items = cart.filter(c => c.checked).map(c => ({ goodsId: c.goodsId, name: c.name, pic: c.pic, specText: c.specText, price: c.price, count: c.count }))
  const orderRes = await api.createOrder({ items: items, payType: 1, couponId: coupons[0].id, remark: '测试订单', deliverySlot: '尽快送达（预计45分钟）', addressSnapshot: { name: '张伟', phone: '13800138000', detail: '朝阳区望京SOHO', tag: '家' } })
  check('下单成功', orderRes.success && orderRes.order.status === 2)
  check('订单号生成', /^FL\d+$/.test(orderRes.order.orderNo))
  check('应付金额=商品总价-优惠+配送费', orderRes.order.payAmount === orderRes.order.totalAmount - orderRes.order.discountAmount + orderRes.order.freight)

  // 6. 下单后购物车清空（已结算项移除）
  cart = await api.getCart()
  check('下单后购物车已清空结算项', cart.length === 0)

  // 7. 订单列表包含新订单
  const orders = await api.getOrders({ page: 1, pageSize: 100 })
  check('订单列表总数>=13', orders.total >= 13)
  check('新订单在列表中', orders.list.some(o => o.id === orderRes.order.id))

  // 8. 订单详情 + timeline
  const od = await api.getOrderDetail(orderRes.order.id)
  check('订单详情timeline>=2条', od.timeline.length >= 2)

  // 9. 待付款订单：支付→确认收货→评价流程（用一个种子待付款订单 o1）
  const payRes = await api.payOrder('o1')
  check('模拟支付成功', payRes.success && payRes.order.status === 2)
  const confirmRes = await api.confirmReceive('o4') // o4待收货→已完成
  check('确认收货', confirmRes.success && confirmRes.order.status === 5)

  // 10. 提交评价 → +20积分，订单标记已评价
  const memberBefore = (await api.getMember()).points
  const revRes = await api.submitReview({ orderId: 'o5', items: [{ goodsId: 'g1', score: 5, tags: ['新鲜', '口感甜'], content: '测试评价', images: ['/images/item/01.jpg'] }] })
  check('评价成功+20积分', revRes.success)
  const memberAfter = (await api.getMember()).points
  check('积分增加20', memberAfter - memberBefore >= 20)
  const od5 = await api.getOrderDetail('o5')
  check('订单已标记评价', od5.isReviewed === true)

  // 11. 签到
  const signRes = await api.checkIn()
  check('签到成功+10积分', signRes.success && signRes.points > 0)

  // 12. 领券
  const claimRes = await api.claimCoupon('c6')
  check('领取折扣券成功', claimRes.success)

  // 13. 积分兑换 → 扣积分、券入账户
  const ptsBefore = (await api.getMember()).points
  const couponsBefore = (await api.getMyCoupons(1)).length
  const exRes = await api.exchangeGood('ex1')
  check('兑换5元券成功', exRes.success)
  const ptsAfter = (await api.getMember()).points
  check('兑换扣100积分', ptsBefore - ptsAfter === 100)
  const myCouponsAfter = await api.getMyCoupons(1)
  check('兑换后未使用券增加', myCouponsAfter.length === couponsBefore + 1)

  // 14. 地址：新增、默认、删除
  const addrRes = await api.saveAddress({ name: '李四', phone: '13911112222', province: '北京市', city: '北京市', district: '海淀区', detail: '中关村1号', tag: '公司', isDefault: false })
  check('新增地址成功', addrRes.success && addrRes.addresses.length === 3)
  await api.setDefaultAddress(addrRes.addresses[2].id)
  const addrList = await api.getAddresses()
  check('设默认成功', addrList.find(a => a.id === addrRes.addresses[2].id).isDefault === true)
  await api.deleteAddress(addrRes.addresses[2].id)
  check('删除地址成功', (await api.getAddresses()).length === 2)

  // 15. 消息标记已读
  const msgRes = await api.markRead('m2')
  check('消息标记已读', msgRes.success)

  // 16. 收藏切换（g4未在种子收藏中）
  const favRes = await api.toggleFavorite('g4')
  check('收藏切换成功', favRes.success && favRes.isCollect === true)
  const favs = await api.getFavorites()
  check('收藏列表含g4', favs.some(f => f.id === 'g4'))

  // 17. 足迹记录
  await api.addFootprint('g5')
  const fps = await api.getFootprints()
  check('足迹含g5', fps.some(f => f.id === 'g5'))

  // 18. VIP红包领取
  const rbRes = await api.claimRedPacket('rb1')
  check('VIP红包领取成功', rbRes.success)

  // 19. 取消订单（仅待付款可取消）
  const cancelRes = await api.cancelOrder('o1') // o1刚支付→应失败
  check('已支付订单不可取消', !cancelRes.success)

  console.log(`\n=== E2E: ${pass} passed, ${fail} failed ===`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('E2E ERROR', e); process.exit(1) })
