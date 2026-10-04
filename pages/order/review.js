const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

Page({
  data: {
    id: null, order: null, loading: true,
    reviews: [], shopScore: { fresh: 5, speed: 5, package: 5 }, shopContent: '',
    tagsPool: ['新鲜','口感甜','包装好','个头大','送货快','分量足','品牌直供','坏果包赔','回购推荐','性价比高']
  },

  onLoad(options) {
    this.setData({ id: options.id })
    api.orderDetail(options.id).then(o => {
      const reviews = o.items.map(it => ({
        goodsId: it.goodsId, name: it.name, pic: it.pic,
        score: 5, tags: [], content: '', images: []
      }))
      this.setData({ order: o, reviews: reviews, loading: false })
    }).catch(err => { toast.toast(err.message || '加载失败'); this.setData({ loading: false }) })
  },

  setScore(e) {
    const { idx, score } = e.currentTarget.dataset
    const reviews = this.data.reviews
    reviews[idx].score = Number(score)
    this.setData({ reviews })
  },
  toggleTag(e) {
    const { idx, tag } = e.currentTarget.dataset
    const reviews = this.data.reviews
    const t = reviews[idx].tags
    const pos = t.indexOf(tag)
    if (pos >= 0) t.splice(pos, 1)
    else t.push(tag)
    this.setData({ reviews })
  },
  onContent(e) {
    const idx = e.currentTarget.dataset.idx
    const reviews = this.data.reviews
    reviews[idx].content = e.detail.value.slice(0, 100)
    this.setData({ reviews })
  },
  pickImage(e) {
    const idx = e.currentTarget.dataset.idx
    const remain = 6 - this.data.reviews[idx].images.length
    if (remain <= 0) { toast.toast('最多上传6张'); return }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      success: res => {
        const reviews = this.data.reviews
        reviews[idx].images = reviews[idx].images.concat(res.tempFilePaths).slice(0, 6)
        this.setData({ reviews })
      },
      fail: () => {}
    })
  },
  removeImage(e) {
    const { idx, imgIdx } = e.currentTarget.dataset
    const reviews = this.data.reviews
    reviews[idx].images.splice(imgIdx, 1)
    this.setData({ reviews })
  },

  setShopScore(e) {
    const { dim, score } = e.currentTarget.dataset
    const shopScore = Object.assign({}, this.data.shopScore, { [dim]: Number(score) })
    this.setData({ shopScore })
  },
  onShopContent(e) { this.setData({ shopContent: e.detail.value.slice(0, 100) }) },

  submit() {
    if (this.data.submitting) return
    const valid = this.data.reviews.every(r => r.score && r.content.trim())
    if (!valid) { toast.toast('请完成星级评分并填写评价内容'); return }
    this.setData({ submitting: true })
    api.submitReview({
      orderId: this.data.id,
      items: this.data.reviews.map(r => ({ sku: r.goodsId, score: r.score, tags: r.tags, content: r.content, images: r.images }))
    }).then(() => {
      toast.success('评价成功，已获20积分')
      setTimeout(() => wx.navigateBack(), 1200)
    }).catch(err => { this.setData({ submitting: false }); toast.toast(err.message || '提交失败') })
  }
})
