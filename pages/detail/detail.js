const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const dec = require('../../utils/decorate.js')

Page({
  data: {
    sku: '', goods: null, reviews: [], related: [],
    showSpec: false, specValues: [], selSpec: {}, count: 1, finalPrice: 0,
    loading: true, cartCount: 0, swiperIndex: 0, avgScore: 0, reviewCount: 0,
    showAllReviews: false
  },

  onLoad(options) {
    this.sku = options.sku || 'p-hbclz400-1h'
    this.setData({ sku: this.sku })
    this.loadDetail()
    api.recordFootprint(this.sku).catch(() => {})
  },

  onShow() { this.refreshCartBadge() },

  loadDetail() {
    this.setData({ loading: true })
    api.goodsDetail(this.sku).then(g => {
      const goods = dec.goods(g)
      const allReviews = g.reviews || []
      const reviews = allReviews.slice(0, 10).map(r => Object.assign({}, r, {
        scoreArr: [1,2,3,4,5].map(i => i <= r.score)
      }))
      const avgScore = allReviews.length ? (allReviews.reduce((s, r) => s + r.score, 0) / allReviews.length).toFixed(1) : '4.8'
      this.setData({ goods: goods, reviews: reviews, reviewCount: allReviews.length, avgScore: avgScore, loading: false, isCollect: g.isCollect })
      // 看了又看：同分类
      api.goodsList({ page: 1, size: 100 }).then(res => {
        const related = res.list.filter(x => x.categoryName === g.categoryName && x.sku !== g.sku)
          .slice(0, 4).map(dec.goods)
        this.setData({ related: related })
      }).catch(() => {})
    }).catch(err => { toast.toast(err.message || '加载失败'); this.setData({ loading: false }) })
  },

  refreshCartBadge() {
    api.cart().then(c => {
      this.setData({ cartCount: c.reduce((s, x) => s + x.count, 0) })
      badge.setCartBadge(c.reduce((s, x) => s + x.count, 0))
    }).catch(() => {})
  },

  // ---- 规格弹层 ----
  openSpec() {
    const g = this.data.goods
    const specValues = g.specs.map(s => ({ name: s.name, values: s.values.map(v => Object.assign({}, v, { selected: false })) }))
    specValues[0].values[0].selected = true
    if (specValues[1]) specValues[1].values[0].selected = true
    const selSpec = {}
    specValues.forEach(s => { selSpec[s.name] = s.values[0].label })
    this.setData({ showSpec: true, specValues: specValues, selSpec: selSpec, count: 1, finalPrice: g.price, finalPriceYuan: (g.price / 100).toFixed(2) })
  },
  closeSpec() { this.setData({ showSpec: false }) },
  stopTap() {},
  pickSpec(e) {
    const { group, idx } = e.currentTarget.dataset
    const specValues = this.data.specValues
    specValues[group].values.forEach((v, i) => { v.selected = (i === idx) })
    const selSpec = {}
    specValues.forEach(s => { selSpec[s.name] = s.values.find(v => v.selected).label })
    // 最终价格：取选中项的 price
    let price = 0
    specValues.forEach(s => { const v = s.values.find(x => x.selected); if (v.price) price = v.price })
    this.setData({ specValues: specValues, selSpec: selSpec, finalPrice: price, finalPriceYuan: (price / 100).toFixed(2) })
  },
  changeCount(e) {
    const delta = Number(e.currentTarget.dataset.d)
    const stock = this.data.goods.stock
    let count = this.data.count + delta
    count = Math.max(1, Math.min(count, stock))
    this.setData({ count: count })
  },

  buildSpecText() {
    const s = this.data.selSpec
    return (s['规格'] || '标准装') + ' · ' + (s['包装'] || '1份')
  },

  confirmAddCart() {
    api.addCart(this.sku, this.buildSpecText(), this.data.count).then(() => {
      toast.success('加入购物车成功')
      this.setData({ showSpec: false })
      this.refreshCartBadge()
    }).catch(err => toast.toast(err.message || '加入失败'))
  },

  buyNow() {
    const specText = this.buildSpecText()
    this.setData({ showSpec: false })
    wx.navigateTo({ url: `/pages/buy/buy?sku=${this.sku}&spec=${encodeURIComponent(specText)}&count=${this.data.count}&buyNow=1` })
  },

  toggleCollect() {
    api.toggleFavorite(this.sku).then(res => {
      this.setData({ isCollect: res.isCollect })
      toast.toast(res.isCollect ? '已收藏' : '已取消收藏')
    }).catch(() => {})
  },

  goCart() { wx.switchTab({ url: '/pages/shop/shop' }) },
  goVip() { wx.switchTab({ url: '/pages/vip/vip' }) },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },

  onPullDownRefresh() {
    this.loadDetail()
    setTimeout(() => wx.stopPullDownRefresh(), 600)
  },

  // 图片点击全屏预览（详情图 + 评价晒图）
  previewImage(e) {
    const urls = e.currentTarget.dataset.urls || this.data.goods.pics
    const current = e.currentTarget.dataset.src || urls[0]
    wx.previewImage({ urls: urls, current: current, fail: () => {} })
  },
  onSwiperChange(e) { this.setData({ swiperIndex: e.detail.current }) },

  toggleAllReviews() { this.setData({ showAllReviews: !this.data.showAllReviews }) },

  onShareAppMessage() {
    return {
      title: this.data.goods ? (this.data.goods.name + ' ￥' + this.data.goods.priceYuan) : '鲜生活',
      imageUrl: this.data.goods ? this.data.goods.pic : '',
      path: '/pages/detail/detail?sku=' + this.sku
    }
  }
})
