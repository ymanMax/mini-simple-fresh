// 图片兜底：binderror 时自动将失效图片替换为本地默认图，杜绝灰色裂图
var DEFAULT_IMG = '/static/images/default.png'

function findPath(obj, target, prefix) {
  prefix = prefix || ''
  if (obj === null || obj === undefined) return null
  if (typeof obj === 'string') {
    return obj === target ? prefix : null
  }
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      var r = findPath(obj[i], target, prefix + '[' + i + ']')
      if (r) return r
    }
    return null
  }
  if (typeof obj === 'object') {
    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue
      var path = prefix ? prefix + '.' + k : k
      var res = findPath(obj[k], target, path)
      if (res) return res
    }
  }
  return null
}

// 在页面中注册：onImgError: require('../../utils/img.js').make(this)
function make(page) {
  return function (e) {
    var bad = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.src
    if (!bad) return
    var path = findPath(page.data, bad)
    if (path) {
      var update = {}
      update[path] = DEFAULT_IMG
      try { page.setData(update) } catch (err) {}
    }
  }
}

module.exports = { make: make, DEFAULT_IMG: DEFAULT_IMG }
