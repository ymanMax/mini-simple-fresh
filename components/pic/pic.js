// 通用图片组件：自动 binderror 回退默认图，杜绝灰色裂图
Component({
  properties: {
    src: { type: String, value: '' },
    mode: { type: String, value: 'aspectFill' },
    radius: { type: String, value: '0rpx' }
  },
  data: { resolved: '/images/default.png' },
  observers: {
    'src': function(v) {
      this.setData({ resolved: v || '/images/default.png' })
    }
  },
  methods: {
    onError: function() {
      this.setData({ resolved: '/images/default.png' })
    }
  }
})
