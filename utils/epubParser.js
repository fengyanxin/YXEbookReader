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
 * 提取 TOC 路径和 spine 顺序
 */
function extractTOCAndSpine(opfContent) {
  var tocPath = null;
  var spineItems = [];

  // 查找 TOC 引用 - 更宽松的匹配，包括 catalog, ncx, toc 等
  var tocMatch = opfContent.match(/<item[^>]*href="([^"]*(?:toc|catalog|ncx)[^"]*)"[^>]*id="([^"]*)"[^>]*>/i) ||
                 opfContent.match(/<item[^>]*id="([^"]*)"[^>]*href="([^"]*(?:toc|catalog|ncx)[^"]*)"[^>]*>/i) ||
                 opfContent.match(/<item[^>]*href="([^"]*\.ncx)"[^>]*>/i);
  if (tocMatch) {
    tocPath = tocMatch[1] || tocMatch[2];
    console.log('[EPUB] 找到 TOC 文件:', tocPath);
  }

  // 解析 spine 顺序
  var spineMatch = opfContent.match(/<spine[^>]*>[\s\S]*?<\/spine>/);
  if (spineMatch) {
    var itemrefMatches = spineMatch[0].match(/<itemref[^>]*>/g);
    if (itemrefMatches) {
      for (var i = 0; i < itemrefMatches.length; i++) {
        var idrefMatch = itemrefMatches[i].match(/idref="([^"]+)"/);
        if (idrefMatch) {
          spineItems.push(idrefMatch[1]);
        }
      }
    }
  }

  console.log('[EPUB] Spine 顺序:', spineItems.length, '项');

  return { tocPath: tocPath, spineItems: spineItems };
}

/**
 * 解析 TOC 文件 (NCX 格式)
 */
function parseNCXFile(basePath, opfDir, tocPath, manifest, spineItems) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();
    
    // 处理 tocPath，可能不带扩展名或在不同目录
    var tryPaths = [];
    if (tocPath.indexOf('/') >= 0) {
      var dir = tocPath.substring(0, tocPath.lastIndexOf('/'));
      var name = tocPath.substring(tocPath.lastIndexOf('/') + 1);
      tryPaths.push(basePath + '/' + tocPath); // 原路径
      tryPaths.push(basePath + '/' + dir + '/' + name + '.xhtml'); // 加 xhtml
      tryPaths.push(basePath + '/' + dir + '/' + name + '.html'); // 加 html
      if (opfDir) {
        tryPaths.push(basePath + '/' + opfDir + '/' + name + '.xhtml');
      }
    } else {
      tryPaths.push(basePath + '/' + tocPath);
      tryPaths.push(basePath + '/' + tocPath + '.xhtml');
      tryPaths.push(basePath + '/' + tocPath + '.html');
      if (opfDir) {
        tryPaths.push(basePath + '/' + opfDir + '/' + tocPath);
        tryPaths.push(basePath + '/' + opfDir + '/' + tocPath + '.xhtml');
      }
    }

    console.log('[EPUB] 尝试读取 NCX，尝试路径:', tryPaths);

    function tryReadPath(index) {
      if (index >= tryPaths.length) {
        console.log('[EPUB] 所有 NCX 路径都失败');
        resolve([]);
        return;
      }

      var fullPath = tryPaths[index];
      fs.readFile({
        filePath: fullPath,
        encoding: 'utf-8',
        success: function(res) {
          console.log('[EPUB] NCX 读取成功:', fullPath);
          var tocContent = res.data;
          var chapters = [];

          // 解析 NCX 格式
          var navPointMatches = tocContent.match(/<navPoint[^>]*>[\s\S]*?<\/navPoint>/g);
          if (navPointMatches) {
            for (var i = 0; i < navPointMatches.length; i++) {
              var navPoint = navPointMatches[i];

              // 获取标题
              var textMatch = navPoint.match(/<text[^>]*>([^<]+)<\/text>/);
              var chapterTitle = textMatch ? textMatch[1].trim() : '第' + (i + 1) + '章';

              // 获取内容链接
              var contentMatch = navPoint.match(/<content[^>]*src="([^"]+)"/);
              var src = contentMatch ? contentMatch[1] : '';

              // 提取文件名作为 ID
              var fileId = src.split('#')[0].split('/').pop();

              chapters.push({
                id: 'chapter_' + i,
                index: i,
                title: chapterTitle,
                fileId: fileId,
                src: src
              });
            }
          }

          // 如果没有 navPoint，尝试解析 nav 元素
          if (chapters.length === 0) {
            var navMatches = tocContent.match(/<nav[^>]*[^>]*>[\s\S]*?<\/nav>/g);
            if (navMatches) {
              for (var n = 0; n < navMatches.length; n++) {
                var nav = navMatches[n];
                var aMatches = nav.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
                if (aMatches) {
                  for (var j = 0; j < aMatches.length; j++) {
                    var am = aMatches[j].match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
                    if (am) {
                      chapters.push({
                        id: 'chapter_' + chapters.length,
                        index: chapters.length,
                        title: am[2].trim() || '第' + (chapters.length + 1) + '章',
                        fileId: am[1].split('#')[0].split('/').pop(),
                        src: am[1]
                      });
                    }
                  }
                }
              }
            }
          }

          console.log('[EPUB] NCX 解析得到章节:', chapters.length);
          resolve(chapters);
        },
        fail: function(err) {
          console.log('[EPUB] NCX 路径失败:', fullPath);
          tryReadPath(index + 1);
        }
      });
    }

    tryReadPath(0);
  });
}

/**
 * 解析 EPUB3 Nav 文档
 */
function parseNavDocument(basePath, opfDir, tocPath, manifest, spineItems) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();
    var fullPath = basePath + '/' + (opfDir ? opfDir + '/' : '') + tocPath;

    console.log('[EPUB] 读取 Nav:', fullPath);

    fs.readFile({
      filePath: fullPath,
      encoding: 'utf-8',
      success: function(res) {
        var navContent = res.data;
        var chapters = [];

        // 解析 nav 元素 - 查找目录类型的 nav
        var navMatches = navContent.match(/<nav[^>]*[^>]*>[\s\S]*?<\/nav>/g);
        if (navMatches) {
          var chapterIndex = 0;
          for (var n = 0; n < navMatches.length; n++) {
            var nav = navMatches[n];
            
            // 首先尝试找到包含 toc 或 chapter 的 nav
            var isTOCNav = nav.indexOf('toc') > -1 || 
                           nav.indexOf('chapter') > -1 || 
                           nav.indexOf('目录') > -1 || 
                           nav.indexOf('章') > -1 ||
                           nav.indexOf('section') > -1;
            
            // 解析链接
            var aMatches = nav.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
            if (aMatches) {
              for (var i = 0; i < aMatches.length; i++) {
                var am = aMatches[i].match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
                if (am) {
                  var title = am[2].trim();
                  var src = am[1];
                  
                  // 跳过无效的标题
                  if (!title || title.length === 0) continue;
                  
                  // 过滤条件：跳过明显不是章节标题的
                  // - 标题太长（超过80字符）
                  if (title.length > 80) continue;
                  
                  // - 标题包含句号且超过30字符（可能是正文摘录）
                  if (title.length > 30 && (title.indexOf('。') > -1 || title.indexOf('，') > -1)) continue;
                  
                  // - 跳过只有特殊字符的
                  if (/^[\d\s\-_.，。、]+$/.test(title)) continue;
                  
                  // 如果不是 TOC nav，只保留看起来像章节标题的（章、第X章、X.X等）
                  if (!isTOCNav) {
                    var looksLikeChapter = /^[第章节部篇\d\s]+/.test(title) || 
                                          /^\d+[\.\、]/.test(title) ||
                                          title.indexOf('章') > -1 ||
                                          title.indexOf('篇') > -1;
                    if (!looksLikeChapter) continue;
                  }
                  
                  chapters.push({
                    id: 'chapter_' + chapterIndex,
                    index: chapterIndex,
                    title: title,
                    fileId: src.split('#')[0].split('/').pop(),
                    src: src
                  });
                  chapterIndex++;
                }
              }
            }
          }
        }

        // 如果章节太少（少于3章），尝试更宽松的解析
        if (chapters.length < 3) {
          console.log('[EPUB] Nav 章节太少，尝试更宽松的解析');
          chapters = [];
          
          // 直接解析所有链接
          var allAMatches = navContent.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
          if (allAMatches) {
            var seen = {};
            for (var j = 0; j < allAMatches.length; j++) {
              var am = allAMatches[j].match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
              if (am) {
                var title = am[2].trim();
                var src = am[1];
                
                // 跳过无效的和太长的
                if (!title || title.length === 0 || title.length > 100) continue;
                
                // 跳过已经出现过的相同标题
                if (seen[title]) continue;
                seen[title] = true;
                
                chapters.push({
                  id: 'chapter_' + chapters.length,
                  index: chapters.length,
                  title: title,
                  fileId: src.split('#')[0].split('/').pop(),
                  src: src
                });
              }
            }
          }
        }

        console.log('[EPUB] Nav 解析得到章节:', chapters.length);
        resolve(chapters);
      },
      fail: function(err) {
        console.error('[EPUB] Nav 读取失败:', err);
        resolve([]);
      }
    });
  });
}

/**
 * 在目录中查找 TOC 文件
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

    // 提取 TOC 和 spine 信息
    var tocInfo = extractTOCAndSpine(opfContent);
    var opfDir = opfPath.lastIndexOf('/') > 0 ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    // 如果通过 manifest 没有找到文件，尝试在目录中查找
    if (contentFiles.length === 0) {
      console.log('[EPUB] Manifest 中未找到内容文件，尝试扫描目录');
      scanDirectoryForHTML(basePath)
        .then(function(scannedFiles) {
          if (scannedFiles.length > 0) {
            contentFiles = scannedFiles;
            console.log('[EPUB] 目录扫描找到文件:', contentFiles.length);
          }
            // 尝试从目录中查找 TOC 文件
          findTOCInDirectory(basePath)
            .then(function(tocChapters) {
              if (tocChapters && tocChapters.length > 0) {
                console.log('[EPUB] 目录中找到 TOC');
                readContentFilesWithTOC(basePath, opfDir, contentFiles, tocChapters, manifest, [], title, author, description, resolve);
              } else {
                readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
              }
            })
            .catch(function() {
              readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
            });
        })
        .catch(function() {
          readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
        });
    } else if (tocInfo.tocPath) {
      // 判断 TOC 类型
      if (tocInfo.tocPath.indexOf('.ncx') > -1) {
        parseNCXFile(basePath, opfDir, tocInfo.tocPath, manifest, tocInfo.spineItems)
          .then(function(tocChapters) {
            if (tocChapters.length > 0) {
              console.log('[EPUB] 使用 NCX TOC 章节');
              readContentFilesWithTOC(basePath, opfDir, contentFiles, tocChapters, manifest, tocInfo.spineItems, title, author, description, resolve);
            } else {
              readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
            }
          })
          .catch(function() {
            readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
          });
      } else {
        // 尝试 EPUB3 Nav 格式
        parseNavDocument(basePath, opfDir, tocInfo.tocPath, manifest, tocInfo.spineItems)
          .then(function(tocChapters) {
            if (tocChapters.length > 0) {
              console.log('[EPUB] 使用 Nav TOC 章节');
              readContentFilesWithTOC(basePath, opfDir, contentFiles, tocChapters, manifest, tocInfo.spineItems, title, author, description, resolve);
            } else {
              readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
            }
          })
          .catch(function() {
            readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
          });
      }
    } else {
      // 没有 TOC 文件，直接读取内容文件
      readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, tocInfo.spineItems, manifest);
    }
  });
}

/**
 * 在目录中查找 TOC 文件
 */
function findTOCInDirectory(basePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager();
    var tocFiles = [
      'OEBPS/catalog.xhtml', 
      'OEBPS/toc.xhtml', 
      'OEBPS/ncx', 
      'OEBPS/ncx.xhtml',
      'toc.ncx', 
      'nav.xhtml', 
      'nav.html', 
      'toc.xhtml', 
      'toc.html', 
      'TableOfContents.xhtml'
    ];

    function tryNextFile(index) {
      if (index >= tocFiles.length) {
        resolve([]);
        return;
      }

      var tocPath = basePath + '/' + tocFiles[index];
      fs.access({
        path: tocPath,
        success: function() {
          console.log('[EPUB] 找到 TOC 文件:', tocFiles[index]);
          if (tocFiles[index].indexOf('.ncx') > -1 || tocFiles[index] === 'OEBPS/ncx') {
            parseNCXFile(basePath, '', tocFiles[index], {}, [])
              .then(function(chapters) {
                resolve(chapters);
              })
              .catch(function() {
                resolve([]);
              });
          } else {
            // catalog.xhtml 可能是 NCX 格式
            parseNCXFile(basePath, '', tocFiles[index], {}, [])
              .then(function(chapters) {
                if (chapters.length > 0) {
                  resolve(chapters);
                } else {
                  // 尝试作为 Nav 格式解析
                  parseNavDocument(basePath, '', tocFiles[index], {}, [])
                    .then(function(chapters2) {
                      resolve(chapters2);
                    })
                    .catch(function() {
                      resolve([]);
                    });
                }
              })
              .catch(function() {
                resolve([]);
              });
          }
        },
        fail: function() {
          tryNextFile(index + 1);
        }
      });
    }

    tryNextFile(0);
  });
}

/**
 * 使用 TOC 读取内容文件
 */
function readContentFilesWithTOC(basePath, opfDir, contentFiles, tocChapters, manifest, spineItems, title, author, description, resolve) {
  var fs = wx.getFileSystemManager();

  // 建立 fileId 到 href 的映射
  var idToHref = {};
  for (var id in manifest) {
    idToHref[id] = manifest[id];
  }

  // 将 TOC 章节与内容文件匹配
  var chapters = [];
  var tocIndex = 0;

  function readNextTOCChapter(index) {
    if (index >= tocChapters.length) {
      // 所有 TOC 章节处理完成
      console.log('[EPUB] TOC 章节读取完成，章节数:', chapters.length);

      // 只添加没有在 TOC 中但确实存在于内容文件中的章节（排除封面、版权页等）
      var usedFiles = {};
      for (var i = 0; i < chapters.length; i++) {
        if (chapters[i].filePath) {
          var fp = chapters[i].filePath;
          usedFiles[fp] = true;
          usedFiles[fp.split('/').pop()] = true;
        }
      }

      // 需要跳过的文件（封面、版权等）
      var skipFiles = ['cover', 'copyright', 'catalog', 'titlepage', 'toc', 'nav', 'index', 'front'];

      for (var j = 0; j < contentFiles.length; j++) {
        var cf = contentFiles[j];
        var cfName = cf.split('/').pop().replace(/\.[^/.]+$/, '');
        
        // 跳过已经使用或系统性的文件
        if (usedFiles[cf] || usedFiles[cf.split('/').pop()]) {
          continue;
        }
        
        // 跳过封面、版权等文件
        var shouldSkip = false;
        for (var s = 0; s < skipFiles.length; s++) {
          if (cfName.toLowerCase().indexOf(skipFiles[s]) === 0) {
            shouldSkip = true;
            break;
          }
        }
        if (shouldSkip) {
          continue;
        }

        // 添加剩余的有效内容章节
        chapters.push({
          id: 'chapter_' + chapters.length,
          index: chapters.length,
          title: cfName,
          content: '',
          filePath: cf
        });
      }

      // 按 index 排序
      chapters.sort(function(a, b) {
        return a.index - b.index;
      });

      // 重新编号
      for (var k = 0; k < chapters.length; k++) {
        chapters[k].index = k;
        chapters[k].id = 'chapter_' + k;
      }

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

    var tocChapter = tocChapters[index];
    var fileId = tocChapter.fileId;
    var href = idToHref[fileId] || fileId;

    // 查找对应的内容文件 - 使用更精确的匹配
    var contentFilePath = null;
    var fileIdBase = fileId.replace(/\.[^/.]+$/, ''); // 去掉扩展名
    
    for (var i = 0; i < contentFiles.length; i++) {
      var cf = contentFiles[i];
      var cfName = cf.split('/').pop();
      var cfNameBase = cfName.replace(/\.[^/.]+$/, ''); // 去掉扩展名
      
      // 精确匹配文件名（去掉扩展名后）
      if (cfNameBase === fileIdBase || cf.indexOf(fileId) === 0 || cf.endsWith(fileId)) {
        contentFilePath = cf;
        break;
      }
    }

    // 如果没找到，尝试模糊匹配
    if (!contentFilePath) {
      for (var i = 0; i < contentFiles.length; i++) {
        var cf = contentFiles[i];
        if (cf.indexOf(fileId) > -1) {
          contentFilePath = cf;
          break;
        }
      }
    }

    console.log('[EPUB] TOC 章节匹配:', tocChapter.title, '-> fileId:', fileId, '-> 匹配到:', contentFilePath);

    if (contentFilePath) {
      var fullPath = basePath + '/' + (opfDir ? opfDir + '/' : '') + contentFilePath;

      fs.readFile({
        filePath: fullPath,
        encoding: 'utf-8',
        success: function(res) {
          var textContent = extractTextFromHTML(res.data);

          chapters.push({
            id: 'chapter_' + index,
            index: index,
            title: tocChapter.title,
            content: textContent,
            filePath: contentFilePath
          });

          readNextTOCChapter(index + 1);
        },
        fail: function(err) {
          console.error('[EPUB] TOC 章节内容读取失败:', contentFilePath);
          chapters.push({
            id: 'chapter_' + index,
            index: index,
            title: tocChapter.title,
            content: '',
            filePath: contentFilePath
          });
          readNextTOCChapter(index + 1);
        }
      });
    } else {
      console.log('[EPUB] TOC 章节找不到对应文件:', fileId);
      chapters.push({
        id: 'chapter_' + index,
        index: index,
        title: tocChapter.title,
        content: '',
        filePath: ''
      });
      readNextTOCChapter(index + 1);
    }
  }

  readNextTOCChapter(0);
}

/**
 * 读取内容文件 - 作为章节
 */
function readContentFiles(basePath, opfPath, contentFiles, title, author, description, resolve, spineItems, manifest) {
  var fs = wx.getFileSystemManager();

  // 如果有内容文件，读取所有文件作为章节
  if (contentFiles.length > 0) {
    // 获取 OPF 文件所在目录
    var opfDir = opfPath.lastIndexOf('/') > 0 ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    // 根据 spine 顺序排序 contentFiles
    if (spineItems && spineItems.length > 0 && contentFiles.length > 1 && manifest) {
      console.log('[EPUB] 尝试按 spine 顺序排序');
      
      // 先用 manifest 建立 ID -> href 的映射
      // spineItems 是 ID 数组，需要用 manifest[ID] 获取实际文件路径
      var sortedFiles = [];
      var usedFiles = {};
      
      // 首先按 spine 顺序添加文件
      for (var s = 0; s < spineItems.length; s++) {
        var spineId = spineItems[s];
        
        // 从 manifest 获取实际文件路径
        var href = manifest[spineId];
        if (!href) continue;
        
        // 去掉扩展名用于匹配
        var spineBase = href.replace(/\.[^/.]+$/, '');
        
        for (var i = 0; i < contentFiles.length; i++) {
          var cf = contentFiles[i];
          var cfBase = cf.replace(/\.[^/.]+$/, '');
          
          // 匹配：直接比较或去掉目录后比较
          if (cf === href || cfBase === spineBase || cf.endsWith(spineBase) || cf.endsWith(href)) {
            if (!usedFiles[cf]) {
              sortedFiles.push(cf);
              usedFiles[cf] = true;
              break;
            }
          }
        }
      }
      
      // 添加未匹配的文件
      for (var i = 0; i < contentFiles.length; i++) {
        if (!usedFiles[contentFiles[i]]) {
          sortedFiles.push(contentFiles[i]);
        }
      }
      
      if (sortedFiles.length > 0 && sortedFiles.length === contentFiles.length) {
        contentFiles = sortedFiles;
        console.log('[EPUB] Spine 排序成功');
      } else {
        console.log('[EPUB] Spine 排序部分匹配');
      }
    }

    // 需要跳过的短内容文件模式
    var skipPatterns = ['cover', 'copyright', 'catalog', 'titlepage', 'toc', 'nav', 'index', 'front', 'page', 'blank', 'empty'];
    var minContentLength = 100; // 最小内容长度

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
          var htmlContent = res.data;
          
          // 提取文本内容
          var textContent = extractTextFromHTML(htmlContent);

          // 尝试从HTML提取章节标题
          var htmlTitle = extractChapterTitleFromHTML(htmlContent);
          
          // 从文件名提取章节标题作为备选
          var fileName = contentFile.split('/').pop();
          var chapterTitle = fileName.replace(/\.[^/.]+$/, '');
          // 格式化章节标题
          chapterTitle = chapterTitle.replace(/[-_]/g, ' ');
          // 如果标题是纯数字，加上"第X章"
          if (/^\d+$/.test(chapterTitle)) {
            chapterTitle = '第' + chapterTitle + '章';
          }
          
          // 如果从HTML提取到了标题，使用它
          if (htmlTitle) {
            chapterTitle = htmlTitle;
            console.log('[EPUB] 从HTML提取到标题:', chapterTitle);
          }

          // 检查是否应该跳过此文件（短内容或匹配跳过模式）
          var fileNameBase = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
          var shouldSkip = false;
          
          // 检查文件名模式
          for (var p = 0; p < skipPatterns.length; p++) {
            if (fileNameBase.indexOf(skipPatterns[p]) === 0) {
              shouldSkip = true;
              console.log('[EPUB] 跳过文件（匹配模式）:', fileName);
              break;
            }
          }
          
          // 降低跳过阈值，只跳过极短的内容（<50字符）
          var ultraShortContentLength = 50;
          if (!shouldSkip && textContent.length < ultraShortContentLength) {
            shouldSkip = true;
            console.log('[EPUB] 跳过文件（内容极短）:', fileName, '长度:', textContent.length);
          }

          if (!shouldSkip) {
            // 添加到章节数组
            chapters.push({
              id: 'chapter_' + chapters.length,
              index: chapters.length,
              title: chapterTitle,
              content: textContent,
              filePath: contentFile
            });

            console.log('[EPUB] 章节 ' + (chapters.length) + ' 提取完成，标题:', chapterTitle, '长度:', textContent.length);
          }

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
 * 从 HTML 中提取章节标题
 */
function extractChapterTitleFromHTML(html) {
  if (!html) return null;
  
  var title = null;
  
  // 尝试从 <title> 标签提取
  var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
    if (title.length > 0 && title.length < 100) {
      return title;
    }
  }
  
  // 尝试从 <h1> 标签提取
  var h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    title = h1Match[1].trim();
    if (title.length > 0 && title.length < 100) {
      return title;
    }
  }
  
  // 尝试从 <h2> 标签提取
  var h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  if (h2Match && h2Match[1]) {
    title = h2Match[1].trim();
    if (title.length > 0 && title.length < 100) {
      return title;
    }
  }
  
  // 尝试从 class 包含 title 的元素提取
  var classTitleMatch = html.match(/<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/[^>]+>/i);
  if (classTitleMatch && classTitleMatch[1]) {
    title = classTitleMatch[1].trim();
    if (title.length > 0 && title.length < 100) {
      return title;
    }
  }
  
  return null;
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
