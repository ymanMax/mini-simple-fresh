// test/wxml_strict.js —— 引号感知的WXML解析：正确识别标签边界（>在引号/{{}}内不算结束），检查引号与{{}}平衡、表达式合法性
const fs = require('fs')
const path = require('path')

let errors = 0
const files = []
;(function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.wxml')) files.push(p)
  })
})('pages')

function parseFile(src, file) {
  // 逐字符扫描，提取标签（引号内的>不算），注释跳过
  let i = 0, line = 1
  const tags = []
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\n') line++
    if (ch === '<') {
      // 注释?
      if (src.substr(i, 4) === '<!--') {
        const end = src.indexOf('-->', i)
        i = end === -1 ? src.length : end + 3
        continue
      }
      // 找标签结束 >（引号内的>跳过）
      let j = i + 1, inQ = false, q = null
      while (j < src.length) {
        const c = src[j]
        if (inQ) { if (c === q) inQ = false }
        else if (c === '"' || c === "'") { inQ = true; q = c }
        else if (c === '>') break
        j++
      }
      const tagText = src.slice(i, j + 1)
      tags.push({ text: tagText, line: line, start: i })
      i = j + 1
      continue
    }
    i++
  }

  tags.forEach(t => {
    // 引号平衡
    let inQ = false, q = null, bad = false
    for (const ch of t.text) {
      if (inQ) { if (ch === q) inQ = false }
      else if (ch === '"' || ch === "'") { inQ = true; q = ch }
    }
    if (inQ) { console.log(`UNTERMINATED QUOTE ${file}:${t.line}: ${t.text.slice(0, 150)}`); errors++; bad = true }
    // {{}}平衡
    const open = (t.text.match(/\{\{/g) || []).length
    const close = (t.text.match(/}}/g) || []).length
    if (open !== close) { console.log(`UNBALANCED {{}} ${file}:${t.line} open=${open} close=${close}: ${t.text.slice(0, 150)}`); errors++; bad = true }
    // 表达式合法性：提取所有 {{...}}，检查内部引号/括号平衡、无方法调用、无字符串拼接、无===
    const exprRe = /\{\{([^}]*)\}\}/g
    let m
    while ((m = exprRe.exec(t.text)) !== null) {
      const e = m[1]
      // 单双引号平衡
      let sq = (e.match(/'/g) || []).length
      if (sq % 2 !== 0) { console.log(`ODD QUOTES ${file}:${t.line} expr="${e}"`); errors++ }
      // 括号平衡
      const br = { '(': 0, '[': 0, '{': 0 }
      for (const c of e) { if (c === '(') br['(']++; if (c === ')') br['(']--; if (c === '[') br['[']++; if (c === ']') br['[']--; if (c === '{') br['{']++; if (c === '}') br['{']-- }
      if (br['('] !== 0 || br['['] !== 0) { console.log(`UNBALANCED BRACKET ${file}:${t.line} expr="${e}"`); errors++ }
      // === / !==
      if (/===|!==/.test(e)) { console.log(`STRICT EQ ${file}:${t.line} expr="${e}"`); errors++ }
      // 方法调用 .xxx(
      if (/\.[a-zA-Z]+\(/.test(e)) { console.log(`METHOD CALL ${file}:${t.line} expr="${e}"`); errors++ }
      // 字符串拼接 'xxx'+var 或 var+'xxx'
      if (/['"][^'"]*'\s*\+|\+\s*['"]/.test(e)) { console.log(`STRING CONCAT ${file}:${t.line} expr="${e}"`); errors++ }
    }
  })

  // 全文 {{}} 平衡（去除注释后）
  const noComments = src.replace(/<!--[\s\S]*?-->/g, '')
  const open = (noComments.match(/\{\{/g) || []).length
  const close = (noComments.match(/}}/g) || []).length
  if (open !== close) { console.log(`GLOBAL {{}} ${file}: ${open} vs ${close}`); errors++ }
}

files.forEach(f => parseFile(fs.readFileSync(f, 'utf8'), f))
console.log(`\n=== STRICT WXML: ${errors} errors, ${files.length} files ===`)
process.exit(errors ? 1 : 0)
