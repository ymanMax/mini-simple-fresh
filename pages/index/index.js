const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const dec = require('../../utils/decorate.js')

Page({
  data: {
    banners: [], navArea: [], goods: [], seckill: [],
    page: 1, hasMore: true, loading: true, loadingMore: false,
    countdown: { h: '02', m: '30', s: '00' }
  },

  onShow() { this.refreshCartBadge(); this.startCountdown() },
  onUnload() { if (this._timer) clearInterval(this._timer) },

  startCountdown() {
    if (this._timer) return
    let total = 2 * 3600 + 30 * 60
    const tick = () => {
      total -= 1
      const h = String(Math.floor(total / 3600)).padStart(2, '0')
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
      const s = String(total % 60).padStart(2, '0')
      this.setData({ countdown: { h: h, m: m, s: s } })
    }
    this._timer = setInterval(tick, 1000)
  },

  onLoad() { this.loadHome(); this.loadGoods(1) },

  onShow() { this.refreshCartBadge() },

  loadHome() {
    api.home().then(res => {
      this.setData({ banners: res.banners, navArea: res.navArea })
    }).catch(() => {})
    Promise.all([api.promotions(), api.goodsList({ page: 1, size: 100 })]).then(([promos, all]) => {
      const bySku = {}
      all.list.forEach(g => { bySku[g.sku] = g })
      const seckill = (promos[0] && promos[0].seckillGoods || []).map(s => Object.assign({}, s, {
        pic: bySku[s.goodsId] ? bySku[s.goodsId].pic : '',
        name: bySku[s.goodsId] ? bySku[s.goodsId].name : '',
        seckillPriceYuan: (s.seckillPrice / 100).toFixed(2)
      }))
      this.setData({ seckill: seckill })
    }).catch(() => {})
  },

  loadGoods(page) {
    this.setData({ loading: page === 1, loadingMore: page > 1 })
    api.goodsList({ page: page, size: 10 }).then(res => {
      const items = res.list.map(dec.goods)
      const list = page === 1 ? items : this.data.goods.concat(items)
      this.setData({ goods: list, page: page, hasMore: res.hasMore, loading: false, loadingMore: false })
    }).catch(() => { this.setData({ loading: false, loadingMore: false }) })
  },

  refreshCartBadge() {
    api.cart().then(cart => {
      const total = cart.reduce((s, x) => s + x.count, 0)
      badge.setCartBadge(total)
    }).catch(() => {})
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) this.loadGoods(this.data.page + 1)
  },
  onPullDownRefresh() {
    this.loadHome(); this.loadGoods(1)
    setTimeout(() => wx.stopPullDownRefresh(), 600)
  },

  goSearch() { wx.navigateTo({ url: '/pages/search/search' }) },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },
  goNav(e) {
    const link = e.currentTarget.dataset.link
    if (!link) return
    const TABS = ['/pages/vip/vip', '/pages/shop/shop', '/pages/me/me', '/pages/index/index']
    if (TABS.indexOf(link) >= 0) wx.switchTab({ url: link })
    else wx.navigateTo({ url: link })
  },
  goSeckill(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },
  goBanner(e) {
    const link = e.currentTarget.dataset.link
    if (!link) return
    const TABS = ['/pages/vip/vip', '/pages/shop/shop', '/pages/me/me', '/pages/index/index']
    if (TABS.indexOf(link) >= 0) wx.switchTab({ url: link })
    else wx.navigateTo({ url: link })
  },
  goPromotion() { wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' }) },

  addCart(e) {
    const sku = e.currentTarget.dataset.sku
    api.addCart(sku, '标准装 · 1份', 1).then(() => {
      toast.success('加入购物车成功')
      this.refreshCartBadge()
    }).catch(err => toast.toast(err.message || '加入失败'))
  }
})
