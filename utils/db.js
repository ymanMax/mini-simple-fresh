// utils/db.js —— 内存数据库（含 storage 持久化）
// 金额单位：分。所有写操作同步写入 storage，保证跨页面一致。

var F = '/images/goods/'
var DEFAULT_PIC = '/images/default.png'

// ============ 8 大分类 ============
var CATEGORIES = [
  { id: 1, name: '水果', icon: '/images/cat/fruit.png' },
  { id: 2, name: '蔬菜', icon: '/images/cat/veg.png' },
  { id: 3, name: '肉类', icon: '/images/cat/meat.png' },
  { id: 4, name: '水产', icon: '/images/cat/seafood.png' },
  { id: 5, name: '乳品', icon: '/images/cat/dairy.png' },
  { id: 6, name: '零食', icon: '/images/cat/snack.png' },
  { id: 7, name: '饮品', icon: '/images/cat/drink.png' },
  { id: 8, name: '日用', icon: '/images/cat/daily.png' }
]

// ============ 商品库（58 个；基础商品 32 + 同品类变体 26，利用 _z/_s 变体图） ============
// price/originalPrice/memberPrice 单位：分；spec 内 price 为该规格最终单价（分）
// picOverride: 自定义主图（变体商品使用 _z/_s 图）
function goods(id, sku, name, subtitle, catId, catName, price, market, stock, unit, origin, tags, sells, desc, picOverride) {
  var mainPic = picOverride || (F + 'g' + id + '.jpg')
  var gallery = picOverride
    ? [mainPic, mainPic, mainPic, mainPic]
    : [mainPic, F + 'g' + id + '_z.jpg', F + 'g' + id + '_s.jpg', mainPic]
  return {
    id: id,
    sku: sku,
    name: name,
    subtitle: subtitle,
    pic: mainPic,
    pics: gallery,
    categoryId: catId,
    categoryName: catName,
    minPrice: price,
    originalPrice: market,
    stock: stock,
    unit: unit,
    origin: origin,
    tags: tags,
    numberSells: sells,
    memberPrice: Math.round(price * 0.85),
    description: desc,
    detailImages: gallery,
    viewCount: Math.floor(sells * 3.7),
    collectCount: Math.floor(sells * 0.12),
    hot: sells > 5000,
    specs: [
      {
        name: '规格',
        values: [
          { label: '标准装', price: price, stock: stock, pic: mainPic },
          { label: '家庭装(1.5倍)', price: Math.round(price * 1.5), stock: Math.floor(stock * 0.6), pic: mainPic }
        ]
      }
    ]
  }
}

var GOODS = [
  goods(1, 'p-hbclz400-1h', '美国车厘子400g*1盒', 'JJ级大果，果肉紧实脆甜', 1, '水果', 2990, 3990, 31, '盒', '美国', ['顺丰包邮', '产地直发', '当季现摘'], 8600, '精选JJ级美国车厘子，果径28mm以上，果肉深红紧实，脆甜多汁，冷链配送锁住新鲜。'),
  goods(2, 'p-HBxjwzlpt-1h', '新疆无籽露葡萄500g*1盒', '无籽脆甜，一口爆汁', 1, '水果', 990, 1390, 55, '盒', '新疆', ['产地直发', '当季现摘'], 12300, '新疆无籽露葡萄，果粒饱满无籽，皮薄肉脆，含糖量高，自然成熟甜度出众。'),
  goods(3, 'p-HBnfxy-2g', '南非西柚220-300g*2个', '低糖分，富含天然维C', 1, '水果', 890, 1290, 36, '2个', '南非', ['进口鲜果', '坏果包赔'], 9800, '南非进口西柚，果肉粉红柔嫩，酸甜清爽，富含维生素C，适合榨汁与轻食。'),
  goods(4, 'p-hbjkxj1j-1d', '四川会理石榴250-325g*2个', '突尼斯软籽，籽红如宝石', 1, '水果', 990, 1590, 42, '2个', '四川会理', ['产地直发', '当季现摘', '坏果包赔'], 7600, '四川会理突尼斯软籽石榴，籽粒红宝石般鲜亮，软籽可食，多汁清甜。'),
  goods(5, 'p-hbqxxfq-1h', '千禧小番茄500g*1盒', '爆汁小番茄，清甜不酸', 2, '蔬菜', 890, 1190, 68, '盒', '山东', ['当季现摘', '坏果包赔'], 15200, '千禧圣女果，果型饱满均匀，皮薄爆汁，清甜微酸，是沙拉和零食的首选。'),
  goods(6, 'p-blgs-450g', '板栗红薯500g(约3-5个)', '软糯香甜，烤着吃流蜜', 2, '蔬菜', 1290, 1690, 44, '袋', '山东', ['产地直发'], 6400, '板栗红薯，地瓜中的“糖心”品种，蒸熟后软糯香甜，烤后流蜜，口感绵密。'),
  goods(7, 'p-gsgghlb-500g', '甘肃供港胡萝卜500g', '脆甜多汁，可生吃', 2, '蔬菜', 990, 1290, 52, '袋', '甘肃', ['供港蔬菜', '产地直发'], 5300, '甘肃高原供港胡萝卜，表皮光滑，芯细味甜，生吃脆爽，熟吃绵软。'),
  goods(8, 'p-ggyjxq-800g', '宁夏供港西芹500g', '纤维少，口感清脆', 2, '蔬菜', 1290, 1590, 38, '颗', '宁夏', ['供港蔬菜'], 3800, '宁夏供港西芹，叶柄宽厚，纤维少，口感清脆，适合凉拌、清炒与榨汁。'),
  goods(9, 'p-hzjzwhr-400', '华正精制五花肉400g', '肥瘦相间，三层五花', 3, '肉类', 1490, 1890, 26, '盒', '黑龙江', ['冷鲜直达', '检疫合格'], 7100, '华正精制五花肉，肥瘦三层分明，冷鲜排酸处理，适合红烧肉、烤肉、梅菜扣肉。'),
  goods(10, 'p-yszfnrp-300g', '月盛斋肥牛肉片300g', '雪花纹理，涮肉首选', 3, '肉类', 3290, 3990, 18, '盒', '内蒙古', ['冷鲜直达', '检疫合格'], 5900, '月盛斋肥牛卷，优选谷饲牛肉，雪花分布均匀，涮火锅不散不柴，肉香浓郁。'),
  goods(11, 'p-yszgyrp-300g', '月盛斋羔羊肉片300g', '草原羔羊，鲜嫩无膻', 3, '肉类', 2990, 3690, 15, '盒', '内蒙古', ['冷鲜直达', '检疫合格'], 4700, '内蒙古草原羔羊肉卷，肉质鲜嫩，几乎无膻味，肥瘦相间，火锅必备。'),
  goods(12, 'p-HBazyqrynp-150g*2', '澳洲原切肉眼牛排150g*2袋', '原切非拼接，大理石花纹', 3, '肉类', 1980, 2680, 12, '2袋', '澳洲', ['进口牛肉', '冷鲜直达'], 3600, '澳洲原切肉眼牛排，非拼接合成，大理石花纹均匀，煎制后肉汁丰盈。'),
  goods(13, 'p-fcbsyp-300g', '巴沙鱼片300g', '去皮去刺，安心大口吃鱼', 4, '水产', 2990, 3590, 28, '袋', '越南', ['无刺无骨', '冷链直达'], 8900, '巴沙鱼柳去皮去刺，肉质细嫩无腥，适合酸菜鱼、番茄鱼、清蒸老人小孩都能吃。'),
  goods(14, 'p-zjbjtx-200g', '加拿大北极虾200g', '甜虾带籽，即食鲜甜', 4, '水产', 1590, 1990, 22, '袋', '加拿大', ['进口海鲜', '冷链直达'], 5400, '加拿大北极甜虾，船冻锁鲜，虾肉自带鲜甜，腹籽饱满，解冻即食。'),
  goods(15, 'p-alsjxxyp-180g', '阿拉斯加狭鳕鱼片180g', '高蛋白低脂肪，儿童辅食', 4, '水产', 1390, 1790, 19, '盒', '阿拉斯加', ['进口海鲜', '无刺无骨'], 3300, '阿拉斯加狭鳕鱼片，肉质洁白细嫩，高蛋白低脂肪，适合宝宝辅食与香煎。'),
  goods(16, 'p-3blmlxlx4-6-500g', '麻辣小龙虾(4-6钱)三盒装', '净虾3斤，加热即食', 4, '水产', 9990, 12990, 20, '3盒', '湖北', ['加热即食', '冷链直达'], 6200, '潜江麻辣小龙虾，4-6钱中虾，秘制麻辣汤汁，加热即食，净虾足3斤。'),
  goods(17, 'p-cxysjywsn-2p', '纯享原味酸奶330g*2瓶', '无添加，醇厚原味', 5, '乳品', 1490, 1790, 35, '2瓶', '中国', ['冷链直达'], 9700, '纯享原味低温酸奶，配料干净口感醇厚，330g大瓶分享装。'),
  goods(18, 'p-nnczsnn-1x', '蒙牛纯甄酸奶200g*12盒', '经典原味，整箱装', 5, '乳品', 3990, 4590, 18, '12盒', '中国', ['品牌直营'], 11200, '蒙牛纯甄经典原味酸奶，12盒整箱装，巴氏杀菌热处理，醇厚丝滑。'),
  goods(19, 'p-hrmghtgl-370g', '活润芒果黄桃果粒酸奶370g', '真果粒，大颗果肉', 5, '乳品', 1290, 1590, 24, '杯', '中国', ['冷链直达'], 6800, '活润果粒酸奶，大颗芒果黄桃果肉，搭配丝滑酸奶，嚼得到的新鲜。'),
  goods(20, 'p-hbyldhjxdtrsj-1z', '养乐多活菌型乳酸菌100ml*5', '每瓶100亿活性乳酸菌', 5, '乳品', 1390, 1690, 30, '5瓶', '日本', ['冷链直达'], 13500, '养乐多活菌型乳酸菌饮品，100ml小瓶5连包，每日一瓶呵护肠道。'),
  goods(21, 'p-HBklbhhymp500g', 'Calbee混合麦片500g', '水果坚果，干吃泡奶都香', 6, '零食', 2990, 3490, 16, '袋', '日本', ['进口零食'], 4200, 'Calbee混合水果坚果麦片，500g大袋，燕麦搭配果干坚果，早餐冲饮干吃皆宜。'),
  goods(22, 'p-HBhtsybp90g*2', '宏途山药薄片90g*2袋', '脆薄山药片，追剧零食', 6, '零食', 790, 990, 40, '2袋', '中国', ['国产零食'], 7800, '宏途山药薄片，薄脆可口，90g两袋装，原味/番茄味，追剧必备。'),
  goods(23, 'p-lsfxslsf-350g', '螺蛳粉先生螺蛳粉350g', '广西柳州正宗，酸辣鲜爽', 6, '零食', 990, 1290, 32, '袋', '广西柳州', ['地方特产'], 18600, '柳州正宗螺蛳粉，350g足料包，酸笋腐竹花生齐全，酸辣鲜爽地道。'),
  goods(24, 'HB-sdcdsqt-240g', '沈大成豆沙青团240g', '江南时令，艾草清香', 6, '零食', 1290, 1590, 14, '袋', '上海', ['地方特产'], 5100, '沈大成豆沙青团，江南时令点心，艾草青皮带细腻红豆沙，软糯清甜。'),
  goods(25, 'p-HBcywjbym380ml', '成有王记冰杨梅果汁380ml', '冰镇杨梅汁，解腻神器', 7, '饮品', 1290, 1590, 45, '瓶', '贵州', ['冷藏饮用'], 8300, '成有王记冰杨梅果汁，贵州杨梅鲜榨，380ml瓶装，冰镇后酸甜解腻。'),
  goods(26, 'p-HBmqnmc-250ml-4', '摩奇柠檬茶250ml*4罐', '怀旧柠檬茶，酸甜够味', 7, '饮品', 1390, 1690, 38, '4罐', '中国', ['怀旧饮品'], 6600, '摩奇柠檬茶250ml四连罐，经典柠檬茶风味，酸甜平衡，冷藏更佳。'),
  goods(27, 'p-wtjhc-250ml-6lb', '维他菊花茶250ml*6盒', '低糖菊花茶，清热润喉', 7, '饮品', 1690, 1990, 26, '6盒', '中国', ['品牌直营'], 9100, '维他菊花茶250ml六盒装，精选菊花，低糖配方，清热润喉四季皆宜。'),
  goods(28, 'p-bklst-2p', '宝矿力水特500ml*2瓶', '电解质补充，运动必备', 7, '饮品', 790, 990, 33, '2瓶', '日本', ['运动饮料'], 7400, '宝矿力水特500ml双瓶装，快速补充水分与电解质，运动出汗后饮用。'),
  goods(29, 'p-mrlpymjcqmjz-1t', '原木浆抽纸6包*130抽*3层', '亲肤无香，家庭囤货装', 8, '日用', 1290, 1690, 28, '提', '中国', ['原生木浆'], 10500, '100%原生木浆抽纸，130抽3层加厚，6包家庭装，亲肤无香不掉屑。'),
  goods(30, 'p-stbnsfhmm-HB', '森田玻尿酸复合面膜5片装', '补水保湿，平价好物', 8, '日用', 1160, 1590, 20, '5片', '中国台湾', ['护肤好物'], 8800, '森田玻尿酸复合面膜5片装，高浓度玻尿酸补水，清爽不黏腻。'),
  goods(31, 'daily-handwash-500', '抑菌洗手液500ml', '99.9%抑菌，温和滋润', 8, '日用', 990, 1290, 36, '瓶', '中国', ['抑菌清洁'], 4500, '抑菌洗手液500ml，99.9%有效抑菌，泡沫细腻温和，全家适用。'),
  goods(32, 'daily-garbagebag', '加厚抽取式垃圾袋100只', '双面加厚，不易破漏', 8, '日用', 690, 990, 44, '卷', '中国', ['日用刚需'], 12800, '加厚抽取式垃圾袋100只装，双面1.2丝加厚，黑色不透明，不易破漏。'),

  // ===== 水果变体（12 个，含基础 4 个）=====
  goods(33, 'var-cl-cherry-500', '智利车厘子JJ级500g', '空运直达，脆甜多汁', 1, '水果', 4990, 5990, 22, '盒', '智利', ['顺丰包邮', '进口鲜果', '坏果包赔'], 5400, '智利JJ级车厘子500g，空运冷链直达，果大肉厚，脆甜多汁。', F + 'g1_z.jpg'),
  goods(34, 'var-dalian-cherry', '大连美早樱桃500g', '国产大樱桃，肉厚核小', 1, '水果', 3990, 4990, 18, '盒', '辽宁大连', ['产地直发', '当季现摘'], 4300, '大连美早大樱桃，露天自然成熟，肉厚核小，酸甜适口。', F + 'g1_s.jpg'),
  goods(35, 'var-shine-muscat', '阳光玫瑰青提500g', '无籽脆甜，玫瑰清香', 1, '水果', 1590, 1990, 34, '盒', '云南', ['产地直发', '当季现摘'], 11200, '阳光玫瑰青提，果粒饱满，无籽脆甜，带有淡淡玫瑰香。', F + 'g2_z.jpg'),
  goods(36, 'var-kyoho-grape', '巨峰葡萄1kg家庭装', '皮薄肉厚，爆汁清甜', 1, '水果', 1690, 2190, 28, 'kg', '辽宁', ['产地直发', '当季现摘'], 7800, '巨峰葡萄1kg家庭装，皮薄易剥，果肉爆汁，清甜不腻。', F + 'g2_s.jpg'),
  goods(37, 'var-israel-grapefruit', '以色列红心西柚4个装', '低卡低糖，维C满满', 1, '水果', 1590, 1990, 30, '4个', '以色列', ['进口鲜果', '坏果包赔'], 5200, '以色列红心西柚4个装，果肉粉嫩，酸甜清爽，减脂期好搭档。', F + 'g3_z.jpg'),
  goods(38, 'var-gannan-navel', '赣南脐橙5斤装', '冰糖甜，手剥即开', 1, '水果', 1990, 2590, 40, '5斤', '江西赣州', ['产地直发', '当季现摘', '坏果包赔'], 13400, '赣南脐橙5斤装，果肉细嫩化渣，冰糖甜，手剥即开。', F + 'g3_s.jpg'),
  goods(39, 'var-soft-pomegranate', '软籽石榴3斤家庭装', '籽软可食，大口吃榴', 1, '水果', 1890, 2390, 26, '3斤', '四川会理', ['产地直发', '坏果包赔'], 6100, '会理软籽石榴3斤家庭装，籽软无需吐渣，多汁清甜。', F + 'g4_z.jpg'),
  goods(40, 'var-pomegranate-gift', '突尼斯石榴礼盒6个装', '节日送礼，精致礼盒', 1, '水果', 2990, 3690, 15, '礼盒', '四川会理', ['产地直发', '节日礼盒'], 2800, '突尼斯软籽石榴6个礼盒装，红黄鲜果，走亲访友体面之选。', F + 'g4_s.jpg'),

  // ===== 蔬菜变体（12 个，含基础 4 个）=====
  goods(41, 'var-tomato-2box', '千禧小番茄2盒装', '双倍爆汁，追剧零食', 2, '蔬菜', 1590, 1990, 48, '2盒', '山东', ['当季现摘', '坏果包赔'], 9600, '千禧小番茄2盒装，果型饱满，皮薄爆汁，代餐零食皆宜。', F + 'g5_z.jpg'),
  goods(42, 'var-millennium-1kg', '千禧圣女果1kg装', '量大实惠，清甜不酸', 2, '蔬菜', 1590, 1890, 36, 'kg', '山东', ['当季现摘'], 5400, '千禧圣女果1kg实惠装，清甜微酸，沙拉首选。', F + 'g5_s.jpg'),
  goods(43, 'var-honey-sweet-potato', '蜜薯糖心红薯2.5斤', '烤着吃流蜜，蒸着吃软糯', 2, '蔬菜', 1490, 1890, 42, '2.5斤', '山东', ['产地直发'], 8200, '蜜薯糖心红薯2.5斤，糖心流蜜，蒸烤皆宜，香甜软糯。', F + 'g6_z.jpg'),
  goods(44, 'var-watermelon-sweet', '西瓜红蜜薯5斤装', '大分量，全家共享', 2, '蔬菜', 2490, 2990, 30, '5斤', '福建', ['产地直发'], 4600, '西瓜红蜜薯5斤装，皮薄肉厚，香甜细腻，大分量更实惠。', F + 'g6_s.jpg'),
  goods(45, 'var-fruit-carrot-1kg', '水果胡萝卜1kg', '生吃脆甜，开袋即食', 2, '蔬菜', 1590, 1890, 44, 'kg', '甘肃', ['供港蔬菜', '产地直发'], 6300, '水果胡萝卜1kg，芯细味甜，可生吃，沙拉榨汁皆可。', F + 'g7_z.jpg'),
  goods(46, 'var-mini-carrot-300', '迷你手指胡萝卜300g', '宝宝辅食，干净免洗', 2, '蔬菜', 890, 1190, 52, '盒', '甘肃', ['供港蔬菜'], 7100, '迷你手指胡萝卜300g，干净免洗，清甜脆嫩，宝宝辅食好选择。', F + 'g7_s.jpg'),
  goods(47, 'var-celad-salad', '西芹沙拉套装2颗', '低卡高纤，轻食必备', 2, '蔬菜', 2190, 2590, 24, '2颗', '宁夏', ['供港蔬菜'], 3500, '西芹沙拉套装2颗，纤维少口感脆，轻食减脂好搭档。', F + 'g8_z.jpg'),
  goods(48, 'var-organic-celery', '有机芹菜1把', '清香浓郁，家常快炒', 2, '蔬菜', 990, 1290, 38, '把', '宁夏', ['供港蔬菜', '有机种植'], 5800, '有机芹菜1把，叶柄宽厚清香，家常快炒、凉拌皆宜。', F + 'g8_s.jpg'),

  // ===== 肉类变体（8 个，含基础 4 个）=====
  goods(49, 'var-premium-belly-500', '精品五花肉500g', '肥瘦相间，红烧绝配', 3, '肉类', 1790, 2190, 22, '盒', '黑龙江', ['冷鲜直达', '检疫合格'], 6200, '精品五花肉500g，三层肥瘦分明，红烧、烤肉、梅菜扣肉皆宜。', F + 'g9_z.jpg'),
  goods(50, 'var-belly-400b', '前排五花肉400g', '冷鲜排酸，肉质软嫩', 3, '肉类', 1490, 1790, 20, '盒', '黑龙江', ['冷鲜直达', '检疫合格'], 4800, '前排五花肉400g，冷鲜排酸处理，肉质软嫩多汁。', F + 'g9_s.jpg'),
  goods(51, 'var-fatten-beef-500', '原切肥牛卷500g', '大包装，火锅家庭装', 3, '肉类', 4990, 5990, 14, '盒', '内蒙古', ['冷鲜直达', '原切非拼接'], 7400, '原切肥牛卷500g家庭装，雪花分布均匀，涮肉不散不柴。', F + 'g10_z.jpg'),
  goods(52, 'var-snowflake-beef-300', '雪花牛肉片300g', '大理石花纹，煎烤皆宜', 3, '肉类', 3990, 4690, 12, '盒', '澳洲', ['进口牛肉', '冷鲜直达'], 3900, '雪花牛肉片300g，大理石花纹丰富，煎烤涮皆宜。', F + 'g10_s.jpg'),

  // ===== 水产变体（6 个，含基础 4 个）=====
  goods(53, 'var-basa-1kg', '巴沙鱼柳1kg家庭装', '无刺无骨，宝宝放心吃', 4, '水产', 4990, 5990, 18, 'kg', '越南', ['无刺无骨', '冷链直达'], 5600, '巴沙鱼柳1kg家庭装，去皮去刺，肉质细嫩，全家老少皆宜。', F + 'g13_z.jpg'),
  goods(54, 'var-sweet-shrimp-500', '冷冻甜虾500g', '船冻锁鲜，腹籽饱满', 4, '水产', 2990, 3590, 16, '盒', '加拿大', ['进口海鲜', '冷链直达'], 4100, '冷冻北极甜虾500g，船冻锁鲜，腹籽饱满，解冻即食鲜甜。', F + 'g14_z.jpg'),

  // ===== 乳品变体（6 个，含基础 4 个）=====
  goods(55, 'var-chunxiang-6bottle', '纯享酸奶6瓶组合', '多人分享，醇厚原味', 5, '乳品', 3990, 4590, 20, '6瓶', '中国', ['冷链直达'], 8600, '纯享原味酸奶6瓶组合，330g大瓶，配料干净，醇厚丝滑。', F + 'g17_z.jpg'),
  goods(56, 'var-zhen-zhen-24', '纯甄酸奶24盒整箱', '囤货装，常温保存', 5, '乳品', 7990, 8990, 10, '24盒', '中国', ['品牌直营'], 9300, '蒙牛纯甄24盒整箱囤货装，常温保存，早餐伴侣。', F + 'g18_z.jpg'),

  // ===== 零食品体（5 个，含基础 4 个）=====
  goods(57, 'var-snail-spicy', '螺蛳粉加臭加辣400g', '双倍爽辣，地道柳州', 6, '零食', 1190, 1490, 28, '袋', '广西柳州', ['地方特产'], 12800, '加臭加辣版螺蛳粉400g，双倍酸笋双倍辣，过瘾地道。', F + 'g23_z.jpg'),

  // ===== 饮品类体（5 个，含基础 4 个）=====
  goods(58, 'var-lemon-tea-8', '摩奇柠檬茶8罐量贩装', '聚会分享，经典怀旧', 7, '饮品', 2490, 2990, 22, '8罐', '中国', ['怀旧饮品'], 5900, '摩奇柠檬茶8罐量贩装，经典怀旧风味，聚会分享更划算。', F + 'g26_z.jpg')
]

// ============ 首页 banner ============
var BANNERS = [
  { id: 1, name: '新鲜水果 产地直发', path: '/images/banner/b01.jpg', link: '/pages/category/index' },
  { id: 2, name: '时令蔬菜 供港品质', path: '/images/banner/b02.jpg', link: '/pages/category/index' },
  { id: 3, name: '限时抢购 会员专享', path: '/images/banner/b03.jpg', link: '/pages/promotion/index?tab=seckill' }
]

// 金刚区
var LANTERNS = [
  { id: 1, name: '限时抢购', image: '/images/cat/seckill.png', link: '/pages/promotion/index?tab=seckill' },
  { id: 2, name: '新鲜水果', image: '/images/cat/fruit.png', link: '' },
  { id: 3, name: '时令蔬菜', image: '/images/cat/veg.png', link: '' },
  { id: 4, name: '肉禽蛋品', image: '/images/cat/meat.png', link: '' },
  { id: 5, name: '海鲜水产', image: '/images/cat/seafood.png', link: '' },
  { id: 6, name: '乳品烘焙', image: '/images/cat/dairy.png', link: '' },
  { id: 7, name: '零食饮料', image: '/images/cat/snack.png', link: '' },
  { id: 8, name: '领券中心', image: '/images/cat/coupon.png', link: '/pages/coupon/index?tab=center' }
]

// ============ 默认地址 ============
var SEED_ADDRESSES = [
  { id: 1, name: '张先生', phone: '13800138000', province: '北京市', city: '北京市', district: '朝阳区', detail: '望京街道阜通东大街 8 号院 3 号楼 502 室', tag: '家', isDefault: true, distanceKm: 2.5 },
  { id: 2, name: '张女士', phone: '13900139000', province: '北京市', city: '北京市', district: '海淀区', detail: '中关村大街 27 号大厦 B 座 1208 室', tag: '公司', isDefault: false, distanceKm: 8.2 }
]

// ============ 领券中心 ============
var COUPON_CENTER = [
  { id: 1, name: '满59减8', type: 1, threshold: 5900, discount: 800, scope: '全场通用', status: 1, expireDays: 7, source: '领取', total: 200, left: 156 },
  { id: 2, name: '满99减20', type: 1, threshold: 9900, discount: 2000, scope: '全场通用', status: 1, expireDays: 15, source: '领取', total: 100, left: 73 },
  { id: 3, name: '满199减50', type: 1, threshold: 19900, discount: 5000, scope: '全场通用', status: 1, expireDays: 15, source: '领取', total: 50, left: 21 },
  { id: 4, name: '8.8折券', type: 2, threshold: 0, discount: 88, scope: '水果专区', status: 1, expireDays: 10, source: '领取', total: 100, left: 64 },
  { id: 5, name: '无门槛5元', type: 3, threshold: 0, discount: 500, scope: '全场通用', status: 1, expireDays: 7, source: '领取', total: 300, left: 210 }
]

// 用户初始持券（含未使用/已使用/已过期）
var SEED_MY_COUPONS = [
  { id: 101, couponId: 1, name: '满59减8', type: 1, threshold: 5900, discount: 800, scope: '全场通用', status: 1, expireTime: '', source: '领取' },
  { id: 102, couponId: 5, name: '无门槛5元', type: 3, threshold: 0, discount: 500, scope: '全场通用', status: 1, expireTime: '', source: '领取' },
  { id: 103, couponId: 2, name: '满99减20', type: 1, threshold: 9900, discount: 2000, scope: '全场通用', status: 2, expireTime: '', source: '领取', useTime: '' },
  { id: 104, couponId: 8, name: '生日8.8折券', type: 2, threshold: 0, discount: 88, scope: '全场通用', status: 1, expireTime: '', source: '生日赠送' },
  { id: 105, couponId: 9, name: '生日礼包10元', type: 3, threshold: 0, discount: 1000, scope: '全场通用', status: 3, expireTime: '', source: '生日赠送' }
]

// ============ 种子订单（覆盖各状态）============
// 状态：1待付款 2待发货 3配送中 4待收货 5已完成 6已取消
function mkOrder(id, status, items, createOffsetMin, payType, remark, useCoupon) {
  var now = Date.now()
  var createTime = now - createOffsetMin * 60000
  var total = 0, discount = 0
  items.forEach(function (it) { total += it.price * it.count })
  if (useCoupon && total >= useCoupon.threshold) discount = useCoupon.discount
  var freight = total - discount >= 5900 ? 0 : 600
  var payAmount = total - discount + freight
  var timeline = [
    { time: new Date(createTime).toLocaleString('zh-CN', { hour12: false }), status: '订单提交成功', remark: '您的订单已提交' }
  ]
  if (status >= 2) timeline.push({ time: new Date(createTime + 15 * 60000).toLocaleString('zh-CN', { hour12: false }), status: '支付成功', remark: '微信支付 ' + (payAmount / 100).toFixed(2) + ' 元' })
  if (status >= 3) timeline.push({ time: new Date(createTime + 60 * 60000).toLocaleString('zh-CN', { hour12: false }), status: '仓库分拣完成', remark: '商品已打包出库' })
  if (status >= 4) timeline.push({ time: new Date(createTime + 90 * 60000).toLocaleString('zh-CN', { hour12: false }), status: '骑手取货配送中', remark: '骑手 李师傅 13812345678 正在为您配送' })
  if (status >= 5) timeline.push({ time: new Date(createTime + 120 * 60000).toLocaleString('zh-CN', { hour12: false }), status: '订单已送达', remark: '感谢光临，期待再次光临' })
  return {
    id: id,
    orderNo: 'FL' + String(createTime).slice(0, 13),
    status: status,
    items: items,
    totalAmount: total,
    discountAmount: discount,
    freight: freight,
    payAmount: payAmount,
    couponId: useCoupon ? useCoupon.id : null,
    couponTitle: useCoupon ? useCoupon.name : '',
    payType: payType || 1,
    remark: remark || '',
    deliveryDate: '尽快送达（预计45分钟）',
    deliverySlot: '尽快送达（预计45分钟）',
    addressSnapshot: SEED_ADDRESSES[0],
    rider: status >= 4 ? { name: '李师傅', phone: '13812345678' } : null,
    timeline: timeline,
    isReviewed: status === 5,
    createTime: createTime
  }
}

function item(goodsId, specLabel, count) {
  var g = GOODS[goodsId - 1]
  var price = g.specs[0].values[0].price
  return { goodsId: goodsId, sku: g.sku, name: g.name, pic: g.pic, specText: specLabel || '标准装', price: price, count: count }
}

var SEED_ORDERS = [
  mkOrder(1, 1, [item(1, '标准装', 1), item(2, '标准装', 2)], 30, 1, '', null),
  mkOrder(2, 2, [item(9, '标准装', 1)], 300, 1, '请帮忙挑新鲜一点', { id: 1, name: '满59减8', threshold: 5900, discount: 800 }),
  mkOrder(3, 3, [item(13, '标准装', 1), item(14, '标准装', 1)], 600, 1, '', null),
  mkOrder(4, 4, [item(20, '家庭装(1.5倍)', 1)], 1400, 2, '', { id: 5, name: '无门槛5元', threshold: 0, discount: 500 }),
  mkOrder(5, 5, [item(23, '标准装', 3)], 3 * 24 * 60, 1, '', { id: 2, name: '满99减20', threshold: 9900, discount: 2000 }),
  mkOrder(6, 5, [item(18, '标准装', 1)], 5 * 24 * 60, 1, '', null),
  mkOrder(7, 5, [item(29, '标准装', 2), item(32, '标准装', 1)], 8 * 24 * 60, 1, '', null),
  mkOrder(8, 6, [item(30, '标准装', 1)], 10 * 24 * 60, 1, '不想要了', null)
]

// ============ 种子评价 ============
var REVIEW_NAMES = ['爱吃水果的猫', '美食探索家', '厨房小白', '宝妈小李', '健身达人', '吃货本货', '品质生活', '低调的食客']
var REVIEW_TAGS_MAP = {
  1: ['新鲜', '个头大', '口感甜', '包装好'],
  2: ['新鲜', '口感甜', '包装好'],
  23: ['味道正宗', '分量足', '性价比高'],
  18: ['品牌直营', '日期新鲜', '口感好'],
  29: ['厚实耐用', '性价比高', '不掉屑']
}
var SEED_REVIEWS = []
;[
  [1, 5, '车厘子非常新鲜，果实又大又甜，冷链配送很快，包装也很用心，会回购！'],
  [1, 5, 'JJ级果然名不虚传，脆甜多汁，孩子特别爱吃。'],
  [2, 5, '无籽葡萄太好吃了，脆甜爆汁，一斤很快就吃完了。'],
  [2, 4, '新鲜度不错，个别果子有点软，整体满意。'],
  [23, 5, '正宗柳州味，酸辣鲜爽，煮的时候整个屋子都香，回购第三次了。'],
  [18, 5, '整箱很划算，日期新鲜，常温保存方便，每天早餐来一瓶。'],
  [29, 5, '纸巾厚实不掉屑，家庭囤货很合适，价格比超市便宜。']
].forEach(function (r, i) {
  var gid = r[0], score = r[1], content = r[2]
  SEED_REVIEWS.push({
    id: i + 1,
    orderId: 5 + (i % 3),
    goodsId: gid,
    userId: 'u' + (i + 1),
    userName: REVIEW_NAMES[i % REVIEW_NAMES.length],
    avatar: '/images/avatar/a' + ((i % 8) + 1) + '.png',
    score: score,
    tags: REVIEW_TAGS_MAP[gid] || ['新鲜', '包装好'],
    content: content,
    images: [],
    createTime: Date.now() - (i + 1) * 3600000 * 24
  })
})

// ============ 会员 ============
var SEED_MEMBER = {
  userId: 'demo_user',
  nickName: '鲜生活用户',
  avatar: '/images/avatar/default.png',
  level: 3,
  levelName: '金卡会员',
  growthValue: 3280,
  nextLevelGrowth: 5000,
  points: 360,
  validDate: '2027-10-04',
  privileges: ['专属折扣 95折', '每月赠券', '免配送费门槛 39元', '优先配送', '专属客服', '生日礼包升级']
}

// ============ 积分流水 ============
var SEED_POINTS = [
  { id: 1, type: 1, points: 120, desc: '购物消费奖励（订单 #5）', createTime: Date.now() - 3 * 24 * 3600000 },
  { id: 2, type: 2, points: 10, desc: '每日签到奖励', createTime: Date.now() - 1 * 3600000 },
  { id: 3, type: 3, points: 20, desc: '商品评价奖励', createTime: Date.now() - 2 * 24 * 3600000 },
  { id: 4, type: 5, points: 200, desc: '生日赠送积分', createTime: Date.now() - 30 * 24 * 3600000 }
]

// ============ 促销：限时抢购 + 满减 ============
// 场次：10:00 / 14:00 / 20:00（状态在接口层按当前时间计算）
var SECKILL_SESSIONS = [
  { sessionId: '10', name: '10:00 场', hour: 10, minute: 0 },
  { sessionId: '14', name: '14:00 场', hour: 14, minute: 0 },
  { sessionId: '20', name: '20:00 场', hour: 20, minute: 0 }
]

// 抢购商品：复用现有商品，抢购价为会员价附近的优惠价
var SECKILL_GOODS = [
  { goodsId: 2, seckillPrice: 690, stock: 30, soldPercent: 72, sessionId: '10' },
  { goodsId: 23, seckillPrice: 690, stock: 40, soldPercent: 85, sessionId: '10' },
  { goodsId: 5, seckillPrice: 690, stock: 50, soldPercent: 45, sessionId: '14' },
  { goodsId: 1, seckillPrice: 2490, stock: 20, soldPercent: 68, sessionId: '14' },
  { goodsId: 20, seckillPrice: 1090, stock: 40, soldPercent: 56, sessionId: '20' },
  { goodsId: 18, seckillPrice: 3490, stock: 15, soldPercent: 33, sessionId: '20' }
]

var FULL_REDUCTION_RULES = [
  { threshold: 5900, reduce: 800, title: '满59减8' },
  { threshold: 9900, reduce: 2000, title: '满99减20' },
  { threshold: 19900, reduce: 5000, title: '满199减50' }
]

// ============ 签到（当月历史记录 + 连签梯度奖励）============
var CHECKIN_REWARDS = [5, 5, 10, 10, 15, 20, 50] // 第1~7天

// ============ 拼团活动 ============
var SEED_GROUPS = [
  {
    id: 1, goodsId: 2, name: '新疆无籽露葡萄500g*1盒', pic: F + 'g2.jpg',
    groupPrice: 690, originalPrice: 990, requiredCount: 3, joinedCount: 2, status: 1,
    endTime: '23:59:59 后结束',
    rules: '3人成团 · 24小时未成团自动退款',
    members: [
      { avatar: '/images/avatar/a1.png', name: '爱吃水果的猫', isLeader: true },
      { avatar: '/images/avatar/a2.png', name: '美食探索家', isLeader: false }
    ]
  },
  {
    id: 2, goodsId: 23, name: '螺蛳粉先生螺蛳粉350g', pic: F + 'g23.jpg',
    groupPrice: 790, originalPrice: 990, requiredCount: 2, joinedCount: 1, status: 1,
    endTime: '12:30:00 后结束',
    rules: '2人成团 · 24小时未成团自动退款',
    members: [
      { avatar: '/images/avatar/a3.png', name: '吃货本货', isLeader: true }
    ]
  },
  {
    id: 3, goodsId: 20, name: '养乐多活菌型乳酸菌100ml*5', pic: F + 'g20.jpg',
    groupPrice: 1090, originalPrice: 1390, requiredCount: 3, joinedCount: 3, status: 2,
    endTime: '已成团',
    rules: '3人成团 · 24小时未成团自动退款',
    members: [
      { avatar: '/images/avatar/a4.png', name: '宝妈小李', isLeader: true },
      { avatar: '/images/avatar/a5.png', name: '健身达人', isLeader: false },
      { avatar: '/images/avatar/a6.png', name: '品质生活', isLeader: false }
    ]
  }
]

// ============ 消息 ============
var SEED_MESSAGES = [
  { id: 1, type: 2, title: '订单配送通知', content: '您的订单正在配送中，请保持电话畅通。', isRead: false, createTime: Date.now() - 3600000, relatedId: 3 },
  { id: 2, type: 3, title: '限时抢购', content: '20:00 场限时抢购即将开始，车厘子低至 ￥24.9，定好闹钟！', isRead: false, createTime: Date.now() - 5 * 3600000, relatedId: { page: 'promotion', tab: 'seckill' } },
  { id: 3, type: 1, title: '系统通知', content: '欢迎使用鲜生活，新用户首单立减5元，满59免配送费。', isRead: true, createTime: Date.now() - 2 * 24 * 3600000, relatedId: null },
  { id: 4, type: 4, title: '评价提醒', content: '您有1笔订单待评价，评价可得20积分。', isRead: true, createTime: Date.now() - 6 * 3600000, relatedId: 5 },
  { id: 5, type: 3, title: '优惠券到账', content: '满99减20优惠券已到账，全场通用，有效期15天。', isRead: false, createTime: Date.now() - 8 * 3600000, relatedId: { page: 'coupon', tab: '1' } },
  { id: 6, type: 1, title: '生日福利', content: '生日月专属礼包已发放：8.8折券 + 双倍积分卡，快去查看！', isRead: true, createTime: Date.now() - 3 * 24 * 3600000, relatedId: { page: 'coupon', tab: '1' } }
]

// ============ 内存状态 ============
var state = {
  cart: [],          // [{id, goodsId, name, pic, specText, price, count, checked, stock, invalid}]
  favorites: [],      // [goodsId]
  footprints: [],     // [{goodsId, time}]
  myCoupons: [],
  orders: [],
  reviews: [],
  addresses: [],
  pointsRecords: [],
  messages: [],
  member: {},
  checkin: { lastDate: '', streak: 0, signedDates: [] },
  goodsVersion: 0,
  groupBuys: [],
  myJoins: [],
  birthdayGiftGranted: false
}

// ============ 持久化 ============
var KEYS = ['cart', 'favorites', 'footprints', 'myCoupons', 'orders', 'reviews', 'addresses', 'pointsRecords', 'messages', 'member', 'checkin', 'groupBuys', 'myJoins', 'birthdayGiftGranted']

function hydrate() {
  var seeded = false
  try {
    var flag = wx.getStorageSync('fresh_db_seeded')
    if (flag) {
      KEYS.forEach(function (k) {
        var v = wx.getStorageSync(k)
        if (v !== '' && v !== null && v !== undefined) state[k] = v
      })
      seeded = true
    }
  } catch (e) {}
  if (!seeded) {
    state.addresses = JSON.parse(JSON.stringify(SEED_ADDRESSES))
    state.myCoupons = JSON.parse(JSON.stringify(SEED_MY_COUPONS))
    state.orders = JSON.parse(JSON.stringify(SEED_ORDERS))
    state.reviews = JSON.parse(JSON.stringify(SEED_REVIEWS))
    state.pointsRecords = JSON.parse(JSON.stringify(SEED_POINTS))
    state.messages = JSON.parse(JSON.stringify(SEED_MESSAGES))
    state.member = JSON.parse(JSON.stringify(SEED_MEMBER))
    // 签到种子：最近 3 天已签（不含今天），连签 3 天
    var signed = []
    for (var d = 1; d <= 3; d++) {
      var dt = new Date(Date.now() - d * 86400000)
      var p = function (n) { return n < 10 ? '0' + n : '' + n }
      signed.push(dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate()))
    }
    state.checkin = { lastDate: signed[2], streak: 3, signedDates: signed }
    state.groupBuys = JSON.parse(JSON.stringify(SEED_GROUPS))
    state.myJoins = []
    state.birthdayGiftGranted = true
    persistAll()
    try { wx.setStorageSync('fresh_db_seeded', 1) } catch (e) {}
  }
}

function persist(key) {
  try {
    if (key) { wx.setStorageSync(key, state[key]) }
    else { KEYS.forEach(function (k) { wx.setStorageSync(k, state[k]) }) }
  } catch (e) {}
}

function persistAll() { persist() }

// ============ 对外 getter ============
module.exports = {
  CATEGORIES: CATEGORIES,
  GOODS: GOODS,
  BANNERS: BANNERS,
  LANTERNS: LANTERNS,
  COUPON_CENTER: COUPON_CENTER,
  SECKILL_SESSIONS: SECKILL_SESSIONS,
  SECKILL_GOODS: SECKILL_GOODS,
  FULL_REDUCTION_RULES: FULL_REDUCTION_RULES,
  CHECKIN_REWARDS: CHECKIN_REWARDS,
  hydrate: hydrate,
  persist: persist,
  state: state,
  // 工具：按 id 取商品
  getGoods: function (id) {
    for (var i = 0; i < GOODS.length; i++) if (GOODS[i].id === id) return GOODS[i]
    return null
  },
  getGoodsBySku: function (sku) {
    for (var i = 0; i < GOODS.length; i++) if (GOODS[i].sku === sku) return GOODS[i]
    return null
  }
}
