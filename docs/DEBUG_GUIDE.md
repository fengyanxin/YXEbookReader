# EPUB/PDF 解析调试指南

## 开启调试日志

### 1. 微信开发者工具

1. 打开项目
2. 点击 **调试器** 面板
3. 切换到 **Console** 标签
4. 上传文件时观察日志输出

### 2. 关键日志标识

- `[EPUB]` - EPUB 解析相关日志
- `[PDF]` - PDF 解析相关日志

## EPUB 解析日志

### 正常流程
```
[EPUB] 开始解析: xxx.epub
[EPUB] 文件路径: xxx
[EPUB] 文件存在，开始解压
[EPUB] 临时目录: xxx
[EPUB] 解压成功
[EPUB] 开始解析目录
[EPUB] container.xml 读取成功
[EPUB] OPF 路径: OEBPS/content.opf
[EPUB] 找到 OPF: OEBPS/content.opf
[EPUB] 读取 OPF: xxx
[EPUB] OPF 读取成功
[EPUB] 解析 OPF 内容
[EPUB] 标题: xxx
[EPUB] 作者: xxx
[EPUB] 找到内容文件: 5
[EPUB] 读取内容文件: xxx
[EPUB] 内容提取成功，长度: 1234
[EPUB] 临时文件已清理
[EPUB] 解析成功: xxx
```

### 错误情况
```
[EPUB] 解压失败: ...
→ 文件可能损坏或不是有效的 EPUB

[EPUB] container.xml 不存在，尝试默认路径
→ 尝试使用默认 OPF 路径

[EPUB] 内容文件读取失败: ...
→ HTML 文件可能不存在

[EPUB] 内容提取成功，长度: 0
→ EPUB 可能没有可提取的文本内容
```

## PDF 解析日志

### 正常流程
```
[PDF] 开始解析: xxx.pdf
[PDF] 文件路径: xxx
[PDF] 文件存在，开始提取
[PDF] 文件读取成功，大小: 123456
[PDF] 元数据提取: {title: "xxx", author: "xxx"}
[PDF] 找到文本流: 15
[PDF] 文本提取成功，长度: 2345
[PDF] 解析成功，内容长度: 2345
```

### 错误情况
```
[PDF] 不是有效的 PDF 文件
→ 文件可能不是 PDF 格式

[PDF] 未找到文本流，可能是图片型 PDF
→ PDF 是图片型或扫描件，无法提取文本

[PDF] 找到文本流: 0
→ 没有可提取的文本内容
```

## 常见问题排查

### EPUB 上传后没有内容

**检查步骤：**
1. 查看 Console 是否有 `[EPUB]` 日志
2. 确认是否有 `解压成功` 日志
3. 检查 `内容提取成功，长度` 是否大于 0

**可能原因：**
- EPUB 文件损坏
- EPUB 是图片格式（非文本）
- EPUB 使用了不支持的编码

### PDF 上传后提示"无法提取文本"

**检查步骤：**
1. 查看 Console 日志
2. 确认是否显示 `未找到文本流`
3. 检查 PDF 是否可以在其他软件中选择文本

**可能原因：**
- 图片型 PDF（扫描件）
- 加密的 PDF
- 纯图片 PDF

### 文件上传失败

**检查步骤：**
1. 确认文件大小 < 50MB
2. 确认文件扩展名正确（.epub, .pdf）
3. 检查网络连接

### 解析卡住不动

**检查步骤：**
1. 查看是否有加载动画
2. 查看 Console 是否有错误
3. 尝试使用较小的文件测试

## 测试用文件

### 推荐 EPUB 测试文件

可以到以下网站下载测试用 EPUB：
- Project Gutenberg (https://www.gutenberg.org/) - 公版书 EPUB
- Feedbooks (https://www.feedbooks.com/) - 免费公版 EPUB

### 推荐 PDF 测试文件

- 任何 Word 导出的 PDF
- 网页打印的 PDF
- 文本型的电子书 PDF

### 不推荐测试

- ❌ 扫描的 PDF
- ❌ 图片型 PDF
- ❌ 加密的文件
- ❌ 超大文件（>50MB）

## 手动验证文件

### 验证 EPUB 是否有效

1. 将 EPUB 文件扩展名改为 .zip
2. 尝试解压
3. 检查是否包含：
   - `mimetype` 文件
   - `META-INF/container.xml`
   - `.opf` 文件
   - `.html` 或 `.xhtml` 文件

### 验证 PDF 是否包含文本

1. 用 Adobe Reader 或其他 PDF 阅读器打开
2. 尝试用鼠标选择文本
3. 如果能选择文字，则可以解析
4. 如果无法选择，则是图片型 PDF

## 报告问题时请提供

1. 文件格式（EPUB/PDF）
2. 文件大小
3. Console 日志截图
4. 错误提示内容
5. 文件来源（哪里下载的）
