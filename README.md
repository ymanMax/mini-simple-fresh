# 鲜生活 FreshLife —— 生鲜商城小程序（V2.0 完整版）

微信原生小程序（非 Taro/uni-app），**无需后端服务**：全部数据由本地 Mock 内存数据库 + `wx.request` 拦截器提供，写操作（加购/下单/支付/领券/签到/评价/退款）在内存中真实生效并通过 `wx.setStorageSync` 持久化，跨页面实时一致。

## 快速开始

用微信开发者工具导入本目录（AppID 已配置 `wx6a64429119a4e0eb`），`urlCheck: false`，无需启动任何服务器。首次运行自动播种数据（购物车为空、8 个分类、58 个商品、种子订单、优惠券、消息、签到记录、拼团、促销）。

## 技术架构

```
app.js ──► utils/mock.js（wx.request 拦截器 + 48 个 API 路由 + 内存数据库）
            │
utils/db.js      种子数据：商品/分类/轮播/优惠券/订单/地址/会员/消息/拼团/促销/签到
utils/format.js  金额：分 → 元（两位小数），禁止字符串参与计算
utils/api.js     Promise 化请求封装（统一错误 toast）
utils/toast.js   toast/确认弹窗/mock 支付（2s loading）
utils/badge.js   TabBar 角标（购物车 index2 / 我的 index3 未读消息）
utils/imgBehavior.js  图片 binderror → /images/default.png 兜底
utils/checkout.js 立即购买中转
pages/*          23 个页面
images/          58 张商品实拍图(本地) + banner + 分类图标 + 头像 + 空态图 + Tab 图标
```

## 4 个固定 Tab（不可改动）

| Tab | 页面 | 功能 |
|---|---|---|
| 首页 | pages/index | 搜索入口 + banner + 金刚区 + **限时抢购模块**（倒计时/进度条）+ 商品分页列表 |
| 会员+ | pages/vip | 等级成长体系（5级/进度条）+ 生日福利 + 签到入口 + 会员专享商品 |
| 购物车 | pages/shop | 列表/stepper/左滑删除/失效区/全选/满减提示/结算 |
| 我的 | pages/me | 用户卡/成长进度/订单快捷角标/菜单分组/消息未读红点 |

## 全部页面清单（23 个）

**基础（需求1-5）**：商品分类 `category`、搜索 `search`、购物车 `shop`、订单确认 `buy`、订单列表/详情/评价 `order/*`、地址列表/编辑 `address/*`、个人中心 `me`、优惠券 `coupon`、积分 `member/points`。

**延伸（需求6-10）**：
- 需求6 商品详情与互动：`detail`（SKU弹层/收藏/评价/轮播预览/看了又看/足迹自动记录/分享）、收藏 `my/collect`、足迹 `my/footprint`（按日分组/删除/清空）
- 需求7 物流与售后：订单详情 `order/detail`（timeline/骑手卡/催发货模拟推进/一键配送演示/申请退款）、订单列表多商品缩略图
- 需求8 会员成长与签到：`vip`（成长值进度/5级对照/生日礼包）、签到日历 `member/checkin`（当月日历/7天梯度奖励/连签）
- 需求9 促销与优惠联动：`promotion`（限时抢购场次/倒计时/进度条 + 满减阶梯 + 领券）、购物车满减提示、订单确认页（先满减后用券/拆分明细）、首页抢购模块、banner/金刚区促销入口
- 需求10 消息中心：`message`（分类Tab/分页/全部已读/关联跳转/3秒延迟推送）、TabBar 未读角标

**其他**：拼团 `group`、关于我们/店铺主页（评分展示）`company`、日志 `logs`。

## 关键业务规则

- **金额单位**：所有价格底层为「分」，前端 `price/100` 转「元」两位小数；满减与用券：先满减（自动取最高阶梯：满59减8/满99减20/满199减50），后用券，可叠加。
- **配送费**：满 59 元免基础配送费，否则 6 元。
- **mock 支付**：点击 → 2 秒 loading → 成功；货到付款下单自动进入「待发货」。
- **签到**：7 天梯度 +5/+5/+10/+10/+15/+20/+50，连签不断档；签到写积分记录并发系统消息。
- **状态推进演示**：订单详情「催发货」/「一键演示」每 3 秒推进一个节点（取货→派送→送达），全程写 timeline + 订单消息。
- **登录态**：支持 `getUserInfo` 授权；未授权使用默认游客信息，依赖登录的页面不报错。
- **图片**：全部为本地真实图，`binderror` 统一回退 `/images/default.png`，无灰色裂图。
- **包体积**：约 1.9MB（主包限制内），商品图压缩至 400px。

## Mock API（48 个路由，均返回 `{errno,msg,data}`）

商品 `home / categories / goods/list(分页/搜索/排序) / goods/detail`；购物车 `cart / cart/add / update / toggleAll / remove / clearInvalid / seckill/buy`；订单 `orders/list(分页/状态) / orders/detail / create / pay / cancel / confirm / advance / refund / review`；地址 `addresses/list / save / delete / setDefault`；优惠券 `coupons/center / claim / mine`；积分 `points/list(分页) / points/shop / points/exchange`；签到 `checkin/status / checkin/do`；收藏足迹 `favorites/list|toggle / footprints/list|remove|clear`；消息 `messages/list(分类/分页) / readAll / readOne / pushDemo`；促销 `promotion/home`；拼团 `group/list|join / group/my`；会员 `member/info / vip/home / shop/info`；搜索热词 `hotwords`。

## 测试

V1 全链路（40+ 断言）与 V2 延伸（促销/签到/退款/推进/足迹/消息分页/VIP成长等）在 Node + wx shim 下全部通过；所有 JS 通过 `node --check`；WXML 标签闭合、图片引用、事件处理器、API 端点均经静态交叉校验，无缺失。
