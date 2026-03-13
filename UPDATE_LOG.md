# EPUB 和 PDF 解析功能更新说明

## 更新内容

已为电子书阅读器小程序添加 EPUB 和 PDF 格式的解析功能。

## 新增文件

### 解析器
- `utils/epubParser.js` - EPUB 格式解析器
- `utils/pdfParser.js` - PDF 格式解析器

### 文档
- `docs/PARSER_GUIDE.md` - 解析功能使用指南
- `docs/TESTING_PARSER.md` - 解析功能测试指南

## 修改的文件

### 页面更新
- `pages/upload/upload.js` - 集成 EPUB/PDF 解析器
- `pages/upload/upload.wxml` - 更新状态栏占位
- `pages/reader/reader.js` - 添加 EPUB/PDF 内容处理
- `pages/reader/reader.wxml` - 添加 EPUB/PDF 内容显示
- `pages/reader/reader.wxss` - 添加 PDF 提示样式

## EPUB 解析功能

### 支持特性
- ✅ 解压 EPUB 文件（ZIP 格式）
- ✅ 提取元数据（书名、作者、简介）
- ✅ 提取文本内容
- ✅ 自动生成封面

### 工作原理
1. 使用 `wx.getFileSystemManager().unzip()` 解压
2. 读取 `META-INF/container.xml` 获取 OPF 路径
3. 解析 OPF 文件获取内容清单
4. 从 HTML 文件中提取纯文本
5. 清理和格式化文本内容

### 限制
- 不支持加密 EPUB
- 不显示图片和复杂样式
- 仅提取文本内容

## PDF 解析功能

### 支持特性
- ✅ 识别 PDF 文件格式
- ✅ 提取文本内容
- ✅ 提取元数据
- ✅ 估算页数

### 工作原理
1. 检查 PDF 文件魔数
2. 查找 PDF 文本流（BT/ET 标记）
3. 解码文本操作符（Tj, TJ）
4. 处理字符串编码
5. 清理和格式化文本

### 限制
- **图片型 PDF 无法提取文本**
- **扫描型 PDF 需要 OCR**
- **加密 PDF 无法解析**

## 使用方法

### 上传 EPUB
```
1. 点击"上传"标签
2. 选择 EPUB 文件
3. 等待解析完成
4. 确认书籍信息
5. 保存到书架
```

### 上传 PDF
```
1. 点击"上传"标签
2. 选择 PDF 文件
3. 等待解析完成
4. 查看提取结果
5. 保存到书架
```

### 阅读书籍
- EPUB/PDF 文本会像 TXT 一样分段显示
- 支持字体大小、主题、行间距等设置
- 阅读进度自动保存

## 解析结果示例

### EPUB 解析成功
```json
{
  "type": "EPUB",
  "title": "书籍标题",
  "author": "作者名",
  "description": "书籍简介",
  "content": "提取的文本内容...",
  "totalChapters": 10
}
```

### PDF 解析成功
```json
{
  "type": "PDF",
  "title": "文档标题",
  "author": "未知作者",
  "content": "提取的文本内容...",
  "totalPages": 150
}
```

### PDF 解析失败（图片型）
```json
{
  "type": "PDF",
  "title": "文档标题",
  "content": "PDF 文件《标题》\n\n文本提取功能有限...",
  "error": "extract_failed"
}
```

## 兼容性

| 设备/环境 | 状态 |
|----------|------|
| iOS 微信 | ✅ 支持 |
| Android 微信 | ✅ 支持 |
| 开发者工具 | ✅ 支持 |
| 小于 50MB 文件 | ✅ 支持 |
| 加密文件 | ❌ 不支持 |

## 测试建议

### 推荐测试文件

**EPUB:**
- Project Gutenberg 公版书
- 标准 EPUB 2.0/3.0 文件
- 未加密的商业 EPUB

**PDF:**
- 文字型 PDF（Word 导出）
- 网页转 PDF
- 电子书 PDF

**不推荐:**
- 扫描型 PDF
- 纯图片 PDF
- 加密文件
- 超大文件（>50MB）

## 调试方法

在微信开发者工具中：
1. 打开"调试器"
2. 查看 Console 日志
3. 上传文件观察解析过程

关键日志：
- `解析 EPUB 文件...`
- `解压成功`
- `提取元数据成功`
- `解析 PDF 文件...`
- `提取文本流`

## 常见问题

### Q: EPUB 显示空白？
A: 文件可能损坏或加密，请使用其他 EPUB 测试。

### Q: PDF 无法提取文本？
A: 可能是图片型 PDF，需要使用 OCR 工具。

### Q: 解析很慢？
A: 大文件需要较长处理时间，请耐心等待。

### Q: 支持哪些格式？
A: EPUB 2.0/3.0、PDF 1.x、TXT、MOBI/AZW（基础支持）

## 未来计划

- [ ] EPUB 章节导航
- [ ] EPUB 图片显示
- [ ] PDF 页面预览
- [ ] OCR 集成
- [ ] 更多格式支持

---

**更新日期**: 2024-03-13
**版本**: v1.1.0
