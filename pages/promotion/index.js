const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const dec = require('../../utils/decorate.js')

Page({
  data: {
    tabs: [
      { key: 'seckill', name: '限时抢购' },
      { key: 'fullreduce', name: '满减专区' },
      { key: 'coupon', name: '领券中心' }
    ],
    tab: 'seckill',
    sessions: [], activeSession: 's10',
    seckillList: [], goodsMap: {},
    fullReduceRules: [], fullReduceGoods: [],
    couponCenter: [],
    countdown: { h: '00', m: '00', s: '00' },
    loading: true
  },

  onLoad(options) {
    if (options.tab) this.setData({ tab: options.tab })
    this.loadAll()
  },
  onShow() { this.refreshCartBadge() },

  refreshCartBadge() {
    api.cart().then(c => badge.setCartBadge(c.reduce((s, x) => s + x.count, 0))).catch(() => {})
  },

  loadAll() {
    this.setData({ loading: true })
    Promise.all([api.promotions(), api.goodsList({ page: 1, size: 100 }), api.couponCenter()])
      .then(([promos, all, couponCenter]) => {
        const promo = promos[0]
        const goodsMap = {}
        all.list.forEach(g => { goodsMap[g.sku] = g })
        // 当前场次：按时间自动判断（演示：默认10:00场）
        const sessions = promo.sessions.map(s => Object.assign({}, s, {
          status: this.sessionStatus(s)
        }))
        const activeSession = sessions[0].sessionId
        const seckillList = (promo.sessionGoods[activeSession] || []).map(item => {
          const g = goodsMap[item.goodsId]
          return Object.assign({}, item, {
            pic: g ? g.pic : '', name: g ? g.name : '',
            seckillPriceYuan: (item.seckillPrice / 100).toFixed(2),
            originPriceYuan: g ? (g.originalPrice / 100).toFixed(2) : ''
          })
        })
        this.setData({
          sessions: sessions, activeSession: activeSession,
          seckillList: seckillList, goodsMap: goodsMap,
          fullReduceRules: promo.fullReduceRules,
          fullReduceGoods: all.list.slice(0, 6).map(dec.goods),
          couponCenter: couponCenter.map(c => Object.assign({}, c, {
            discountText: c.type === 2 ? (c.discount / 10).toFixed(1) + '折' : (c.discount / 100).toFixed(2) + '元',
            conditionText: c.threshold > 0 ? '满' + (c.threshold/100).toFixed(2) + '元可用' : '无门槛',
            expireShort: (c.expireTime || '').slice(0, 10)
          })),
          loading: false
        })
        this.startCountdown(sessions[0])
      })
      .catch(() => this.setData({ loading: false }))
  },

  sessionStatus(s) {
    // 演示环境统一按"抢购中"展示（时间固定为今日场次）
    return 2
  },

  setTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },
  pickSession(e) {
    const sid = e.currentTarget.dataset.sid
    this.setData({ activeSession: sid })
    const promo = this.data.seckillList // placeholder
    // 重新组装场次商品
    api.promotions().then(promos => {
      const promoData = promos[0]
      const list = (promoData.sessionGoods[sid] || []).map(item => {
        const g = this.data.goodsMap[item.goodsId]
        return Object.assign({}, item, {
          pic: g ? g.pic : '', name: g ? g.name : '',
          seckillPriceYuan: (item.seckillPrice / 100).toFixed(2),
          originPriceYuan: g ? (g.originalPrice / 100).toFixed(2) : ''
        })
      })
      this.setData({ seckillList: list })
      this.startCountdown(promoData.sessions.find(s => s.sessionId === sid))
    })
  },

  startCountdown(session) {
    if (this._timer) clearInterval(this._timer)
    // 演示倒计时：固定距场次结束 2 小时 30 分（不依赖真实时钟），纯 JS 定时器
    let total = 2 * 3600 + 30 * 60
    const tick = () => {
      if (total <= 0) { clearInterval(this._timer); this.setData({ countdown: { h: '00', m: '00', s: '00' } }); return }
      total -= 1
      const h = String(Math.floor(total / 3600)).padStart(2, '0')
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
      const s = String(total % 60).padStart(2, '0')
      this.setData({ countdown: { h: h, m: m, s: s } })
    }
    tick()
    this._timer = setInterval(tick, 1000)
  },
  onUnload() { if (this._timer) clearInterval(this._timer) },

  addSeckill(e) {
    const sku = e.currentTarget.dataset.sku
    api.addCart(sku, '标准装 · 1份', 1).then(() => {
      toast.success('已加入购物车')
      this.refreshCartBadge()
    }).catch(err => toast.toast(err.message || '加入失败'))
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },

  claim(e) {
    const id = e.currentTarget.dataset.id
    api.claimCoupon(id).then(() => { toast.success('领取成功'); this.loadAll() })
      .catch(err => toast.toast(err.message || '领取失败'))
  }
})
