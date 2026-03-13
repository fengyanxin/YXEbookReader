# EPUB 和 PDF 解析功能说明

## 功能概述

电子书阅读器现在支持 EPUB 和 PDF 格式的解析功能。

## EPUB 解析

### 支持的功能
- ✅ 自动解压 EPUB 文件（ZIP 格式）
- ✅ 提取书籍元数据（书名、作者、简介）
- ✅ 提取文本内容用于阅读
- ✅ 自动生成渐变色封面

### 解析流程
1. 使用 `wx.getFileSystemManager().unzip()` 解压 EPUB 文件
2. 读取 `META-INF/container.xml` 获取 OPF 文件路径
3. 解析 OPF 文件提取元数据和内容清单
4. 读取第一个 HTML/XHTML 内容文件
5. 从 HTML 中提取纯文本内容

### 限制
- ⚠️ 仅提取文本，不支持复杂排版
- ⚠️ 不支持图片显示
- ⚠️ 加密的 EPUB 无法解析
- ⚠️ 复杂的 CSS 样式会被忽略

## PDF 解析

### 支持的功能
- ✅ 识别 PDF 文件格式
- ✅ 提取 PDF 中的文本内容
- ✅ 提取 PDF 元数据（书名、作者等）
- ✅ 估算 PDF 页数

### 解析流程
1. 检查 PDF 文件魔数（%PDF）
2. 查找 PDF 文本流（BT/ET 标记）
3. 解码 PDF 文本操作符（Tj, TJ）
4. 处理字符串和十六进制编码
5. 清理和格式化提取的文本

### 限制
- ⚠️ **图片型 PDF 无法提取文本**
- ⚠️ **扫描型 PDF 需要 OCR 支持**
- ⚠️ **加密 PDF 无法解析**
- ⚠️ 复杂布局可能显示不完整

### 提示
对于无法提取文本的 PDF，建议：
- 使用 PDF 重排工具转换为纯文本
- 使用 OCR 工具处理扫描件
- 导出为 TXT 格式后导入

## 文件大小限制

- 单个文件最大支持 **50MB**
- 超过限制的文件无法上传

## 上传流程

1. 点击"上传"标签
2. 选择"从聊天中选择"
3. 选择 EPUB/PDF 文件
4. 等待解析完成
5. 编辑书籍信息（可选）
6. 保存到书架

## 使用示例

### EPUB
```
上传 EPUB → 解压解析 → 提取文本 → 显示内容
```

### PDF
```
上传 PDF → 检测格式 → 提取文本 → 显示内容
         ↓
    如果无法提取 → 显示提示信息
```

## 常见问题

### Q: EPUB 上传后显示空白？
A: 可能是 EPUB 文件损坏或使用了不支持的编码。请检查文件是否完整。

### Q: PDF 显示"无法提取文本内容"？
A: 这是图片型或扫描型 PDF，需要使用 OCR 工具处理。

### Q: 解析需要多长时间？
A: 通常 1-5 秒，取决于文件大小和设备性能。

### Q: 支持哪些 EPUB 版本？
A: 支持 EPUB 2.0 和 EPUB 3.0 的基本功能。

## 代码结构

```
utils/
├── epubParser.js    # EPUB 解析器
└── pdfParser.js     # PDF 解析器

pages/
└── upload/
    └── upload.js     # 集成解析器的上传页面
```

## API 说明

### epubParser.parseEPUB(filePath, fileName)
解析 EPUB 文件，返回 Promise。

```javascript
epubParser.parseEPUB(filePath, fileName)
  .then(result => {
    console.log(result.title);
    console.log(result.author);
    console.log(result.content);
  })
  .catch(err => {
    console.error(err);
  });
```

### pdfParser.parsePDF(filePath, fileName)
解析 PDF 文件，返回 Promise。

```javascript
pdfParser.parsePDF(filePath, fileName)
  .then(result => {
    console.log(result.title);
    console.log(result.content);
    console.log(result.totalPages);
  })
  .catch(err => {
    console.error(err);
  });
```

## 未来改进计划

- [ ] 添加 EPUB 章节导航
- [ ] 支持 EPUB 图片显示
- [ ] 添加 PDF 页面预览
- [ ] 支持更多编码格式
- [ ] 添加 OCR 集成（扫描件）
