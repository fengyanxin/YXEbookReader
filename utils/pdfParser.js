// utils/pdfParser.js
/**
 * PDF 电子书解析器
 * 使用文本提取方式解析 PDF 内容
 */

/**
 * 解析 PDF 文件
 * @param {string} filePath - 文件路径
 * @param {string} fileName - 文件名
 */
function parsePDF(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    console.log('[PDF] 开始解析:', fileName);
    console.log('[PDF] 文件路径:', filePath);

    var fs = wx.getFileSystemManager();

    // 检查文件是否存在
    fs.access({
      path: filePath,
      success: function() {
        console.log('[PDF] 文件存在，开始提取');
        extractPDFText(filePath, fileName)
          .then(function(result) {
            console.log('[PDF] 解析成功，内容长度:', result.content ? result.content.length : 0);
            resolve(result);
          })
          .catch(function(err) {
            console.error('[PDF] 解析失败:', err);
            // 返回基本信息，不要完全失败
            resolve(createFallbackPDF(fileName, err.message));
          });
      },
      fail: function(err) {
        console.error('[PDF] 文件不存在:', err);
        reject(new Error('文件不存在'));
      }
    });
  });
}

/**
 * 判断是否为 PDF 文件
 */
function isPDFFile(data) {
  if (!data || typeof data === 'string') {
    return false;
  }
  // PDF 文件魔数: %PDF
  try {
    var arr = new Uint8Array(data);
    return arr && arr.length >= 4 && arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46;
  } catch (e) {
    return false;
  }
}

/**
 * 提取 PDF 文本内容
 */
function extractPDFText(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    // 读取文件内容
    fs.readFile({
      filePath: filePath,
      encoding: 'binary', // 使用 binary 编码读取二进制数据
      success: function(res) {
        var content = res.data;

        console.log('[PDF] 文件读取成功，大小:', content.length);

        try {
          // 检查是否为 PDF
          if (!isPDFFile(content)) {
            console.log('[PDF] 不是有效的 PDF 文件');
            resolve(createFallbackPDF(fileName, '文件格式错误'));
            return;
          }

          // 提取元数据
          var metadata = extractMetadata(content);
          console.log('[PDF] 元数据提取:', metadata);

          // 简单的 PDF 文本提取
          var textStreams = extractTextStreams(content);
          console.log('[PDF] 找到文本流:', textStreams.length);

          if (textStreams.length > 0) {
            // 解码文本流
            var decodedText = '';
            for (var i = 0; i < textStreams.length; i++) {
              var decoded = decodePDFTextStream(textStreams[i]);
              if (decoded) {
                decodedText += decoded + '\n\n';
              }
            }

            // 清理文本
            decodedText = cleanExtractedText(decodedText);

            console.log('[PDF] 文本提取成功，长度:', decodedText.length);

            // 如果提取到的文本太少，可能是图片型 PDF
            if (decodedText.length < 50) {
              console.log('[PDF] 提取的文本过少，可能是图片型 PDF');
              resolve(createFallbackPDF(fileName, '图片型 PDF（扫描件）或加密文档'));
              return;
            }

            resolve({
              type: 'PDF',
              title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
              author: metadata.author || '未知作者',
              description: metadata.subject || '',
              content: decodedText,
              totalPages: estimatePDFPages(content),
              fileSize: content.length
            });
          } else {
            // 没有找到文本流
            console.log('[PDF] 未找到文本流，可能是图片型 PDF');
            resolve(createFallbackPDF(fileName, '未找到文本内容（可能是图片型 PDF）'));
          }
        } catch (e) {
          console.error('[PDF] 解析异常:', e);
          resolve(createFallbackPDF(fileName, e.message));
        }
      },
      fail: function(err) {
        console.error('[PDF] 文件读取失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 提取 PDF 元数据
 */
function extractMetadata(content) {
  var metadata = {
    title: '',
    author: '',
    subject: ''
  };

  try {
    // 尝试多种元数据格式
    var titleMatch = content.match(/\/Title\s*\(([^)]*)\)/);
    if (!titleMatch || !titleMatch[1]) {
      titleMatch = content.match(/\/Title\s*<([^>]*)>/);
    }
    if (titleMatch && titleMatch[1]) {
      metadata.title = decodePDFString(titleMatch[1]);
    }

    var authorMatch = content.match(/\/Author\s*\(([^)]*)\)/);
    if (!authorMatch || !authorMatch[1]) {
      authorMatch = content.match(/\/Author\s*<([^>]*)>/);
    }
    if (authorMatch && authorMatch[1]) {
      metadata.author = decodePDFString(authorMatch[1]);
    }

    var subjectMatch = content.match(/\/Subject\s*\(([^)]*)\)/);
    if (!subjectMatch || !subjectMatch[1]) {
      subjectMatch = content.match(/\/Subject\s*<([^>]*)>/);
    }
    if (subjectMatch && subjectMatch[1]) {
      metadata.subject = decodePDFString(subjectMatch[1]);
    }
  } catch (e) {
    console.log('[PDF] 元数据提取失败:', e);
  }

  return metadata;
}

/**
 * 解码 PDF 字符串
 */
function decodePDFString(str) {
  if (!str) return '';

  try {
    // 处理十六进制编码
    if (str.indexOf('<') === 0 && str.lastIndexOf('>') === str.length - 1) {
      var hex = str.slice(1, -1);
      var decoded = '';
      for (var i = 0; i < hex.length; i += 2) {
        var code = parseInt(hex.substr(i, 2), 16);
        if (!isNaN(code)) {
          decoded += String.fromCharCode(code);
        }
      }
      return decoded;
    }

    // 处理普通字符串，解码转义序列
    var decoded = str;
    decoded = decoded.replace(/\\n/g, '\n');
    decoded = decoded.replace(/\\r/g, '\r');
    decoded = decoded.replace(/\\t/g, '\t');
    decoded = decoded.replace(/\\(/g, '(');
    decoded = decoded.replace(/\\)/g, ')');
    decoded = decoded.replace(/\\\\/g, '\\');

    // 解码八进制转义
    decoded = decoded.replace(/\\(\d{1,3})/g, function(match, octal) {
      var code = parseInt(octal, 8);
      if (code <= 255) {
        return String.fromCharCode(code);
      }
      return match;
    });

    return decoded;
  } catch (e) {
    return str;
  }
}

/**
 * 从 PDF 内容中提取文本流
 */
function extractTextStreams(content) {
  var streams = [];
  var match;

  // 方法1: 查找 BT (Begin Text) 和 ET (End Text) 之间的内容
  var btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  while ((match = btEtRegex.exec(content)) !== null) {
    streams.push(match[1]);
  }

  // 方法2: 如果没有找到 BT/ET，尝试查找流对象
  if (streams.length === 0) {
    var streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    while ((match = streamRegex.exec(content)) !== null) {
      var streamContent = match[1];
      // 检查是否包含文本操作符
      if (streamContent.indexOf('Tj') > -1 || streamContent.indexOf('TJ') > -1 || streamContent.indexOf('Tf') > -1) {
        streams.push(streamContent);
      }
    }
  }

  // 方法3: 直接查找字符串操作（更宽松的匹配）
  if (streams.length === 0) {
    // 查找所有带 Tj 操作符的字符串
    var tjRegex = /\(([^)]*)\)\s*Tj/g;
    var combined = '';
    while ((match = tjRegex.exec(content)) !== null) {
      if (match[1].length > 0) {
        combined += match[1] + ' ';
      }
    }
    if (combined.trim().length > 5) {
      streams.push(combined);
    }
  }

  // 方法4: 查找十六进制字符串
  if (streams.length === 0) {
    var hexRegex = /<([0-9A-Fa-f]+)>/g;
    var hexCombined = '';
    while ((match = hexRegex.exec(content)) !== null) {
      var hex = match[1];
      if (hex.length >= 2 && hex.length % 2 === 0) {
        hexCombined += hex + ' ';
      }
    }
    if (hexCombined.trim().length > 10) {
      streams.push(hexCombined);
    }
  }

  return streams;
}

/**
 * 解码 PDF 文本流
 */
function decodePDFTextStream(stream) {
  var text = '';

  // 移除注释
  text = stream.replace(/%[^\r\n]*/g, '');

  // 收集所有字符串
  var strings = [];

  // 处理简单字符串 (...) - 需要处理括号转义
  var stringRegex = /\(([^)]*)\)/g;
  var match;
  while ((match = stringRegex.exec(text)) !== null) {
    var str = match[1];
    // 跳过太短的匹配（可能是误报）或特殊符号
    if (str.length >= 1 && str.indexOf('/') === -1 && str.indexOf('<<') === -1 && str.indexOf('>>') === -1) {
      strings.push(str);
    }
  }

  // 处理十六进制字符串 <...>
  var hexRegex = /<([0-9A-Fa-f]+)>/g;
  while ((match = hexRegex.exec(text)) !== null) {
    var hex = match[1];
    try {
      var decoded = '';
      for (var i = 0; i < hex.length; i += 2) {
        var code = parseInt(hex.substr(i, 2), 16);
        if (!isNaN(code)) {
          // 跳过控制字符
          if (code >= 32 || code === 10 || code === 13) {
            decoded += String.fromCharCode(code);
          }
        }
      }
      if (decoded.length > 0) {
        strings.push(decoded);
      }
    } catch (e) {
      // 忽略解码错误
    }
  }

  // 处理 Tj 操作符 (单个字符串)
  var tjRegex = /\(([^)]*)\)\s*Tj/g;
  var tjStrings = [];
  while ((match = tjRegex.exec(text)) !== null) {
    tjStrings.push(match[1]);
  }

  // 如果有 Tj 操作符，优先使用
  if (tjStrings.length > 0) {
    return tjStrings.join(' ');
  }

  // 否则使用所有找到的字符串
  if (strings.length > 0) {
    return strings.join(' ');
  }

  return '';
}

/**
 * 清理提取的文本
 */
function cleanExtractedText(text) {
  if (!text) return '';

  // 移除控制字符（保留换行符）
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 解码常见 PDF 转义序列
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/\\r/g, '\r');
  text = text.replace(/\\t/g, '\t');
  text = text.replace(/\\(/g, '(');
  text = text.replace(/\\)/g, ')');
  text = text.replace(/\\\\/g, '\\');

  // 解码八进制转义
  text = text.replace(/\\(\d{1,3})/g, function(match, octal) {
    var code = parseInt(octal, 8);
    if (code <= 255 && code >= 32) {
      return String.fromCharCode(code);
    }
    return match;
  });

  // 移除过长的连续空白
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');

  // 移除 PDF 常见伪影
  text = text.replace(/BT\s*/g, '');
  text = text.replace(/ET\s*/g, '');
  text = text.replace(/Tf\s*/g, '');
  text = text.replace(/Td\s*/g, '');
  text = text.replace(/Tj\s*/g, '');

  // 过滤掉非打印字符过多的内容
  var validChars = 0;
  for (var i = 0; i < text.length && i < 100; i++) {
    var charCode = text.charCodeAt(i);
    if ((charCode >= 32 && charCode <= 126) || charCode > 127) {
      validChars++;
    }
  }

  // 如果有效字符比例太低，可能是解析错误
  if (text.length > 10 && validChars / Math.min(text.length, 100) < 0.3) {
    return '';
  }

  text = text.trim();

  // 限制长度
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '\n\n... (内容过长，已截取)';
  }

  return text;
}

/**
 * 估算 PDF 页数
 */
function estimatePDFPages(content) {
  if (!content) return 1;

  // 通过查找 /Type /Page 来估算
  var pageTypeMatches = content.match(/\/Type\s*\/Page\s+/g);
  if (pageTypeMatches) {
    return pageTypeMatches.length;
  }

  // 尝试查找 /Count
  var countMatch = content.match(/\/Count\s+(\d+)/);
  if (countMatch) {
    var count = parseInt(countMatch[1], 10);
    if (count > 0 && count < 10000) {
      return count;
    }
  }

  // 查找 /N (Pages count)
  var nMatch = content.match(/\/N\s+(\d+)/);
  if (nMatch) {
    var n = parseInt(nMatch[1], 10);
    if (n > 0 && n < 10000) {
      return n;
    }
  }

  // 默认估算（基于文件大小）
  var estimatedPages = Math.ceil(content.length / 5000);
  return Math.max(1, Math.min(estimatedPages, 1000));
}

/**
 * 创建降级 PDF 对象（当解析失败时）
 */
function createFallbackPDF(fileName, errorMessage) {
  var title = fileName.replace(/\.[^/.]+$/, '');
  var message = errorMessage || '文本提取失败';

  var content = title + '\n\n' + message + '\n\n';

  // 根据错误类型提供不同建议
  if (message.indexOf('图片') > -1 || message.indexOf('扫描') > -1) {
    content += '⚠️ 这是一个图片型 PDF（扫描件）\n\n';
    content += '解决方案：\n';
    content += '• 使用 OCR 工具将图片转换为文本\n';
    content += '• 使用 PDF 编辑软件导出为文本\n';
    content += '• 尝试使用支持图片 PDF 的专业阅读器';
  } else if (message.indexOf('加密') > -1) {
    content += '⚠️ 这是一个加密的 PDF 文件\n\n';
    content += '解决方案：\n';
    content += '• 使用密码打开 PDF 后另存\n';
    content += '• 使用 PDF 工具移除密码保护';
  } else {
    content += '可能的原因：\n';
    content += '• 图片型 PDF（扫描件）\n';
    content += '• 加密的 PDF 文件\n';
    content += '• 复杂的排版格式\n\n';
    content += '建议：\n';
    content += '• 尝试使用其他 PDF 阅读器打开\n';
    content += '• 尝试重新导出为文本格式';
  }

  return {
    type: 'PDF',
    title: title,
    author: '未知作者',
    description: 'PDF 文件',
    content: content,
    chapters: [],
    totalPages: 10,
    error: message
  };
}

/**
 * 获取 PDF 页面数量
 */
function getPDFPageCount(filePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    fs.readFile({
      filePath: filePath,
      encoding: 'binary',
      success: function(res) {
        var pages = estimatePDFPages(res.data);
        resolve(pages);
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
}

/**
 * 提取 PDF 元数据
 */
function extractPDFMetadata(filePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    fs.readFile({
      filePath: filePath,
      encoding: 'binary',
      success: function(res) {
        var content = res.data;
        var metadata = extractMetadata(content);

        resolve({
          title: metadata.title,
          author: metadata.author,
          subject: metadata.subject,
          creationDate: ''
        });
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  parsePDF: parsePDF,
  getPDFPageCount: getPDFPageCount,
  extractPDFMetadata: extractPDFMetadata,
  extractPDFText: extractPDFText,
  estimatePDFPages: estimatePDFPages,
  isPDFFile: isPDFFile
};
