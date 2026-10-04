// utils/badge.js —— Tab 角标：购物车(2) / 我的(3，未读消息)
var db = require('./db.js')

function cartCount() {
  return db.state.cart.filter(function (c) {
    var g = db.getGoods(c.goodsId)
    return g && g.stock > 0
  }).reduce(function (s, c) { return s + c.count }, 0)
}

function refreshCartBadge() {
  var n = cartCount()
  try {
    if (n > 0) {
      wx.setTabBarBadge({ index: 2, text: String(n), fail: function () {} })
    } else {
      wx.removeTabBarBadge({ index: 2, fail: function () {} })
    }
  } catch (e) {}
}

function refreshMessageBadge() {
  var unread = db.state.messages.filter(function (m) { return !m.isRead }).length
  try {
    if (unread > 0) {
      wx.setTabBarBadge({ index: 3, text: String(unread), fail: function () {} })
    } else {
      wx.removeTabBarBadge({ index: 3, fail: function () {} })
    }
  } catch (e) {}
}

function refreshAllBadges() {
  refreshCartBadge()
  refreshMessageBadge()
}

module.exports = {
  refreshCartBadge: refreshCartBadge,
  refreshMessageBadge: refreshMessageBadge,
  refreshAllBadges: refreshAllBadges,
  cartCount: cartCount
}
