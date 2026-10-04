// utils/imgBehavior.js —— 图片加载失败回退默认图（统一 binderror）
// 单图：data-single="goods.pic"（支持点路径）
// 列表对象字段：data-list="数组名" data-index="{{index}}" data-field="字段名"
module.exports = Behavior({
  methods: {
    imgError: function (e) {
      var d = e.currentTarget.dataset
      try {
        if (d.single) {
          var patch = {}
          patch[d.single] = '/images/default.png'
          this.setData(patch)
        } else if (d.list && d.index !== undefined) {
          var arr = this.data[d.list]
          var item = arr[d.index]
          if (item) {
            item[d.field || 'pic'] = '/images/default.png'
            var p2 = {}
            p2[d.list] = arr
            this.setData(p2)
          }
        }
      } catch (err) {}
    }
  }
})
