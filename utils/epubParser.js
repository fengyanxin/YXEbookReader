// utils/epubParser.js
/**
 * EPUB 电子书解析器
 * EPUB 本质是 ZIP 格式，包含 XHTML 文件
 */

/**
 * 解析 EPUB 文件
 * @param {string} filePath - 文件路径
 * @param {string} fileName - 文件名
 */
function parseEPUB(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    console.log('[EPUB] 开始解析:', fileName);
    console.log('[EPUB] 文件路径:', filePath);

    var fs = wx.getFileSystemManager();

    // 检查文件是否存在
    fs.access({
      path: filePath,
      success: function() {
        console.log('[EPUB] 文件存在，开始解压');
        unzipAndParseEPUB(filePath, fileName)
          .then(function(result) {
            console.log('[EPUB] 解析成功:', result.title);
            resolve(result);
          })
          .catch(function(err) {
            console.error('[EPUB] 解析失败:', err);
            // 尝试直接读取文件内容作为降级方案
            console.log('[EPUB] 尝试降级解析');
            tryDirectReadEPUB(filePath, fileName)
              .then(function(fallbackResult) {
                resolve(fallbackResult);
              })
              .catch(function() {
                // 返回基础信息，不要完全失败
                resolve(createFallbackEPUB(fileName, err.message));
              });
          });
      },
      fail: function(err) {
        console.error('[EPUB] 文件不存在:', err);
        reject(new Error('文件不存在'));
      }
    });
  });
}

/**
 * 降级方案：直接尝试读取 EPUB 文件获取基本信息
 */
function tryDirectReadEPUB(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    try {
      // 尝试直接读取文件（虽然 EPUB 是压缩格式，但可能获取到部分信息）
      fs.readFile({
        filePath: filePath,
        encoding: 'utf-8',
        success: function(res) {
          var content = res.data;

          // 尝试从文件中提取标题信息（部分 EPUB 可能包含未压缩的元数据）
          var title = fileName.replace(/\.[^/.]+$/, '');
          var author = '未知作者';

          // 尝试匹配标题模式
          var titleMatch = content.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/) ||
                          content.match(/<title[^>]*>([^<]+)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }

          var authorMatch = content.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/) ||
                          content.match(/<author[^>]*>([^<]+)<\/author>/);
          if (authorMatch && authorMatch[1]) {
            author = authorMatch[1].trim();
          }

          resolve({
            type: 'EPUB',
            title: title,
            author: author,
            description: '',
            content: title + '\n\n作者：' + author + '\n\n（EPUB 文件需要完整解压才能读取内容，请使用支持 EPUB 的阅读器）',
            chapters: [],
            totalChapters: 0,
            note: '此 EPUB 文件在小程序环境中无法完整解析'
          });
        },
        fail: function() {
          reject(new Error('直接读取失败'));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 判断是否为 ZIP 文件
 */
function isZipFile(data) {
  if (!data || typeof data === 'string') {
    return false;
  }
  // ZIP 文件魔数: PK (0x50 0x4B)
  var arr = new Uint8Array(data);
  return arr && arr.length >= 2 && arr[0] === 0x50 && arr[1] === 0x4B;
}

/**
 * 解压并解析 EPUB
 */
function unzipAndParseEPUB(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    // 创建临时目录 - 使用绝对路径
    var tempDir = wx.env.USER_DATA_PATH + '/epub_' + Date.now();
    console.log('[EPUB] 临时目录:', tempDir);

    // 先清理可能存在的旧临时目录
    try {
      var files = fs.readdirSync(wx.env.USER_DATA_PATH);
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file.indexOf('epub_') === 0) {
          try {
            var oldDir = wx.env.USER_DATA_PATH + '/' + file;
            fs.rmdirSync(oldDir, true);
          } catch (e) {
            // 忽略删除失败
          }
        }
      }
    } catch (e) {
      // 忽略清理失败
    }

    // 创建新临时目录
    fs.mkdir({
      dirPath: tempDir,
      recursive: true,
      success: function() {
        console.log('[EPUB] 临时目录创建成功');
        // 开始解压
        performUnzip(filePath, tempDir, fileName, resolve, reject);
      },
      fail: function(err) {
        console.error('[EPUB] 目录创建失败:', err);
        reject(new Error('无法创建临时目录'));
      }
    });
  });
}

/**
 * 执行解压操作
 */
function performUnzip(filePath, tempDir, fileName, resolve, reject) {
  var fs = wx.getFileSystemManager();

  fs.unzip({
    zipFilePath: filePath,
    targetPath: tempDir,
    success: function() {
      console.log('[EPUB] 解压成功');
      // 开始解析
      parseEpubFromDirectory(tempDir, fileName)
        .then(function(result) {
          // 清理临时文件
          cleanTempFiles(tempDir);
          resolve(result);
        })
        .catch(function(err) {
          console.error('[EPUB] 目录解析失败:', err);
          // 清理临时文件
          cleanTempFiles(tempDir);
          reject(new Error('EPUB 解析失败: ' + err.message));
        });
    },
    fail: function(err) {
      console.error('[EPUB] 解压失败:', err);
      // 清理临时文件
      cleanTempFiles(tempDir);
      reject(new Error('EPUB 解压失败: ' + (err.errMsg || err.message || '未知错误')));
    }
  });
}

/**
 * 从解压后的目录解析 EPUB
 */
function parseEpubFromDirectory(basePath, fileName) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    console.log('[EPUB] 开始解析目录');

    // 先尝试查找 container.xml
    var containerPath = basePath + '/META-INF/container.xml';

    fs.readFile({
      filePath: containerPath,
      encoding: 'utf-8',
      success: function(res) {
        console.log('[EPUB] container.xml 读取成功');
        var content = res.data;
        // 解析 XML 获取 OPF 路径
        var pathMatch = content.match(/full-path="([^"]+)"/);
        var rootfilePath = pathMatch ? pathMatch[1] : null;

        console.log('[EPUB] OPF 路径:', rootfilePath);

        if (rootfilePath) {
          // 读取 OPF 文件
          readOPFFile(basePath, rootfilePath)
            .then(function(result) {
              resolve(result);
            })
            .catch(function(err) {
              console.error('[EPUB] OPF 读取失败:', err);
              resolve(createFallbackEPUB(fileName));
            });
        } else {
          // 尝试默认路径
          tryDefaultOPFPaths(basePath, fileName)
            .then(function(result) {
              resolve(result);
            })
            .catch(function() {
              resolve(createFallbackEPUB(fileName));
            });
        }
      },
      fail: function(err) {
        console.log('[EPUB] container.xml 不存在，尝试默认路径');
        tryDefaultOPFPaths(basePath, fileName)
          .then(function(result) {
            resolve(result);
          })
          .catch(function() {
            resolve(createFallbackEPUB(fileName));
          });
      }
    });
  });
}

/**
 * 尝试默认的 OPF 路径
 */
function tryDefaultOPFPaths(basePath, fileName) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();
    var defaultPaths = [
      'OEBPS/content.opf',
      'OPS/content.opf',
      'content.opf',
      'book.opf'
    ];

    var pathIndex = 0;

    function tryNextPath() {
      if (pathIndex >= defaultPaths.length) {
        reject(new Error('所有默认路径都失败'));
        return;
      }

      var opfPath = defaultPaths[pathIndex];
      var fullPath = basePath + '/' + opfPath;
      pathIndex++;

      fs.access({
        path: fullPath,
        success: function() {
          console.log('[EPUB] 找到 OPF:', opfPath);
          readOPFFile(basePath, opfPath)
            .then(function(result) {
              resolve(result);
            })
            .catch(function() {
              tryNextPath();
            });
        },
        fail: function() {
          tryNextPath();
        }
      });
    }

    tryNextPath();
  });
}

/**
 * 读取 OPF 文件
 */
function readOPFFile(basePath, opfPath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();
    var fullPath = basePath + '/' + opfPath;

    console.log('[EPUB] 读取 OPF:', fullPath);

    fs.readFile({
      filePath: fullPath,
      encoding: 'utf-8',
      success: function(res) {
        console.log('[EPUB] OPF 读取成功');
        parseOPFContent(basePath, opfPath, res.data)
          .then(function(result) {
            resolve(result);
          })
          .catch(function(err) {
            reject(err);
          });
      },
      fail: function(err) {
        console.error('[EPUB] OPF 读取失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 解析 OPF 内容
 */
function parseOPFContent(basePath, opfPath, opfContent) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();

    console.log('[EPUB] 解析 OPF 内容');

    // 提取元数据 - 使用更宽松的正则
    var title = '未知标题';
    var author = '未知作者';
    var description = '';

    // 尝试多种匹配方式
    var titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
    if (!titleMatch || !titleMatch[1]) {
      titleMatch = opfContent.match(/<title[^>]*>([^<]+)<\/title>/);
    }
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    var authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
    if (!authorMatch || !authorMatch[1]) {
      authorMatch = opfContent.match(/<author[^>]*>([^<]+)<\/author>/);
    }
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1].trim();
    }

    var descMatch = opfContent.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    console.log('[EPUB] 标题:', title);
    console.log('[EPUB] 作者:', author);

    // 查找内容文件
    var contentFiles = [];
    var manifest = {};

    // 解析 manifest - 使用 exec 方法
    var manifestRegex = /<item[^>]*>/g;
    var manifestMatch;
    while ((manifestMatch = manifestRegex.exec(opfContent)) !== null) {
      var item = manifestMatch[0];

      // 提取 id
      var idMatch = item.match(/id="([^"]+)"/);
      // 提取 href
      var hrefMatch = item.match(/href="([^"]+)"/);
      // 提取 media-type
      var typeMatch = item.match(/media-type="([^"]+)"/);

      if (hrefMatch && hrefMatch[1]) {
        var href = hrefMatch[1];
        var mediaType = typeMatch ? typeMatch[1] : '';

        if (idMatch) {
          manifest[idMatch[1]] = href;
        }

        // 收集 HTML/XHTML 文件 - 扩展匹配条件
        var isHTML = href.indexOf('.html') === href.length - 5 ||
                      href.indexOf('.xhtml') === href.length - 6 ||
                      href.indexOf('.htm') === href.length - 4;
        var isHTMLType = mediaType.indexOf('html') > -1 ||
                         mediaType.indexOf('xhtml') > -1;

        if (isHTML || isHTMLType) {
          contentFiles.push(href);
        }
      }
    }

    console.log('[EPUB] 找到内容文件:', contentFiles.length);

    // 如果通过 manifest 没有找到文件，尝试在目录中查找
    if (contentFiles.length === 0) {
      console.log('[EPUB] Manifest 中未找到内容文件，尝试扫描目录');
      scanDirectoryForHTML(basePath)
        .then(function(scannedFiles) {
          if (scannedFiles.length > 0) {
            contentFiles = scannedFiles;
            console.log('[EPUB] 目录扫描找到文件:', contentFiles.length);
          }
          readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve);
        })
        .catch(function() {
          readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve);
        });
    } else {
      readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve);
    }
  });
}

/**
 * 读取内容文件 - 作为章节
 */
function readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve) {
  var fs = wx.getFileSystemManager();

  // 如果有内容文件，读取所有文件作为章节
  if (contentFiles.length > 0) {
    // 获取 OPF 文件所在目录
    var opfDir = opfPath.lastIndexOf('/') > 0 ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    // 章节数组
    var chapters = [];
    var currentIndex = 0;

    function readNextFile(index) {
      if (index >= contentFiles.length) {
        // 所有文件读取完成
        console.log('[EPUB] 所有章节读取完成，章节数:', chapters.length);

        resolve({
          type: 'EPUB',
          title: title,
          author: author,
          description: description,
          content: '',
          chapters: chapters,
          totalChapters: chapters.length
        });
        return;
      }

      var contentFile = contentFiles[index];
      var contentFilePath = basePath + '/' + contentFile;

      // 如果文件路径包含子目录（如 OEBPS/chapter1.html）
      if (contentFile.indexOf('/') >= 0) {
        contentFilePath = basePath + '/' + contentFile;
      }
      // 否则，如果文件是相对路径，添加 OPF 目录前缀
      else if (opfDir) {
        contentFilePath = basePath + '/' + opfDir + '/' + contentFile;
      }

      console.log('[EPUB] 读取章节 (' + (index + 1) + '/' + contentFiles.length + '):', contentFilePath);

      fs.readFile({
        filePath: contentFilePath,
        encoding: 'utf-8',
        success: function(res) {
          // 提取文本内容
          var textContent = extractTextFromHTML(res.data);

          // 从文件名提取章节标题
          var fileName = contentFile.split('/').pop();
          var chapterTitle = fileName.replace(/\.[^/.]+$/, '');
          // 格式化章节标题
          chapterTitle = chapterTitle.replace(/[-_]/g, ' ');
          // 如果标题是纯数字，加上"第X章"
          if (/^\d+$/.test(chapterTitle)) {
            chapterTitle = '第' + chapterTitle + '章';
          }

          // 添加到章节数组
          chapters.push({
            id: 'chapter_' + index,
            index: index,
            title: chapterTitle,
            content: textContent,
            filePath: contentFile
          });

          console.log('[EPUB] 章节 ' + (index + 1) + ' 提取完成，标题:', chapterTitle, '长度:', textContent.length);

          readNextFile(index + 1);
        },
        fail: function(err) {
          console.error('[EPUB] 内容文件读取失败:', contentFilePath, err);
          // 跳过这个文件，继续读取下一个
          readNextFile(index + 1);
        }
      });
    }

    readNextFile(0);
  } else {
    // 没有找到内容文件，返回基本信息
    resolve({
      type: 'EPUB',
      title: title,
      author: author,
      description: description,
      content: title + '\n\n作者：' + author + (description ? '\n\n' + description : '\n\n（此 EPUB 文件未能提取文本内容）'),
      chapters: [],
      totalChapters: 0
    });
  }
}

/**
 * 扫描目录查找 HTML 文件（递归）
 */
function scanDirectoryForHTML(dirPath, baseDir, relativePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();
    var htmlFiles = [];

    // 初始化参数
    if (!baseDir) baseDir = dirPath;
    if (!relativePath) relativePath = '';

    try {
      var files = fs.readdirSync(dirPath);
      console.log('[EPUB] 目录扫描:', dirPath, '文件数:', files.length);

      // 处理每个文件/目录
      var promises = [];

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fullPath = dirPath + '/' + file;
        var currentRelativePath = relativePath ? relativePath + '/' + file : file;

        try {
          var stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            // 跳过系统目录
            if (file === '__MACOSX' || file === '.git' || file === '.DS_Store') {
              continue;
            }
            // 递归扫描子目录
            promises.push(scanDirectoryForHTML(fullPath, baseDir, currentRelativePath));
          } else {
            // 检查是否为 HTML 文件
            var lowerFile = file.toLowerCase();
            var isHTML = lowerFile.indexOf('.html') === lowerFile.length - 5 ||
                          lowerFile.indexOf('.xhtml') === lowerFile.length - 6 ||
                          lowerFile.indexOf('.htm') === lowerFile.length - 4;
            if (isHTML) {
              htmlFiles.push(currentRelativePath);
              console.log('[EPUB] 找到 HTML 文件:', currentRelativePath);
            }
          }
        } catch (e) {
          // 跳过无法访问的文件
        }
      }

      // 等待所有子目录扫描完成
      Promise.all(promises).then(function(results) {
        for (var j = 0; j < results.length; j++) {
          htmlFiles = htmlFiles.concat(results[j]);
        }
        resolve(htmlFiles);
      }).catch(function() {
        resolve(htmlFiles);
      });

    } catch (e) {
      console.log('[EPUB] 目录扫描失败:', e);
      resolve([]); // 返回空数组而不是拒绝
    }
  });
}

/**
 * 从 HTML 中提取纯文本
 */
function extractTextFromHTML(html) {
  if (!html) return '';

  var text = html;

  // 移除样式和脚本
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 移除 HTML 注释
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // 处理段落 - 转换为换行
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');

  // 移除所有 HTML 标签
  text = text.replace(/<[^>]+>/g, '');

  // 解码 HTML 实体
  var entities = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®'
  };

  for (var key in entities) {
    while (text.indexOf(key) > -1) {
      text = text.split(key).join(entities[key]);
    }
  }

  // 解码数字实体 &#1234;
  text = text.replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(parseInt(dec, 10));
  });
  text = text.replace(/&#x([0-9a-fA-F]+);/g, function(match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // 清理多余空白
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.trim();

  // 限制长度
  if (text.length > 15000) {
    text = text.substring(0, 15000) + '\n\n... (内容过长，已截取)';
  }

  return text;
}

/**
 * 清理临时文件
 */
function cleanTempFiles(dirPath) {
  try {
    var fs = wx.getFileSystemManager();
    fs.rmdirSync(dirPath, true);
    console.log('[EPUB] 临时文件已清理');
  } catch (e) {
    console.log('[EPUB] 清理临时文件失败:', e);
  }
}

/**
 * 创建降级 EPUB 对象（当解析失败时）
 */
function createFallbackEPUB(fileName, errorMessage) {
  var title = fileName.replace(/\.[^/.]+$/, '');
  var message = errorMessage || '解析失败';

  var content = title + '\n\n';
  content += '⚠️ EPUB 文件解析失败\n\n';
  content += '错误信息：' + message + '\n\n';
  content += '可能的原因：\n';
  content += '• 文件格式不正确\n';
  content += '• 文件已加密 (DRM 保护)\n';
  content += '• 文件损坏\n\n';
  content += '解决方案：\n';
  content += '• 使用专门的 EPUB 阅读器打开\n';
  content += '• 检查文件是否完整\n';
  content += '• 尝试重新下载或转换文件';

  return {
    type: 'EPUB',
    title: title,
    author: '未知作者',
    description: '',
    content: content,
    chapters: [],
    totalChapters: 0,
    error: message
  };
}

/**
 * 读取 EPUB 章节内容
 */
function readEPUBChapter(epubPath, chapterIndex) {
  return new Promise(function(resolve, reject) {
    // 章节读取功能待实现
    resolve('');
  });
}

module.exports = {
  parseEPUB: parseEPUB,
  readEPUBChapter: readEPUBChapter,
  extractTextFromHTML: extractTextFromHTML
};
