// utils/parser.js
/**
 * 电子书解析工具
 */

/**
 * 解析TXT文件
 */
function parseTXT(content) {
  if (!content) return null;

  // 按行分割
  const lines = content.split('\n');

  // 移除空行
  const cleanLines = lines.filter(line => line.trim());

  return {
    type: 'TXT',
    title: '',
    author: '',
    content: cleanLines.join('\n'),
    chapters: [],
    totalPages: Math.ceil(content.length / 500)
  };
}

/**
 * 解析EPUB文件（简化版）
 * 注意：完整EPUB解析需要JSZip等库支持
 */
function parseEPUB(arrayBuffer) {
  // 简化版EPUB解析
  // 实际项目中需要使用专门的EPUB解析库

  return {
    type: 'EPUB',
    title: 'EPUB书籍',
    author: '',
    content: '',
    chapters: [],
    resources: [],
    toc: []
  };
}

/**
 * 解析PDF文件（简化版）
 * 注意：完整PDF解析需要PDF.js等库支持
 */
function parsePDF(arrayBuffer) {
  // 简化版PDF解析
  // 实际项目中需要使用专门的PDF解析库

  return {
    type: 'PDF',
    title: 'PDF文档',
    author: '',
    content: '',
    pages: [],
    totalPages: 0
  };
}

/**
 * 解析MOBI/AZW文件（简化版）
 */
function parseMOBI(arrayBuffer) {
  // 简化版MOBI解析
  return {
    type: 'MOBI',
    title: 'MOBI书籍',
    author: '',
    content: '',
    chapters: []
  };
}

/**
 * 智能分章
 */
function splitChapters(content) {
  const chapters = [];

  // 常见章节标题正则
  const chapterPatterns = [
    /第[一二三四五六七八九十百千万零]+[章回]/g,
    /Chapter\s*\d+/gi,
    /\d+\.\s+/g,
    /[卷部篇集]\s*[一二三四五六七八九十百千万]+/g
  ];

  // 尝试匹配章节
  for (const pattern of chapterPatterns) {
    const matches = content.match(pattern);

    if (matches && matches.length > 1) {
      const parts = content.split(pattern);
      parts.shift(); // 移除第一个空部分

      for (let i = 0; i < matches.length && i < parts.length; i++) {
        chapters.push({
          title: matches[i],
          content: parts[i]
        });
      }

      if (chapters.length > 0) {
        return chapters;
      }
    }
  }

  // 如果没有找到章节，按段落分割
  const paragraphs = content.split('\n\n');
  const chunkSize = 10; // 每10段为一个章节

  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    const chunk = paragraphs.slice(i, i + chunkSize);
    chapters.push({
      title: `第${Math.floor(i / chunkSize) + 1}节`,
      content: chunk.join('\n\n')
    });
  }

  return chapters;
}

/**
 * 提取书籍元数据
 */
function extractMetadata(content, fileName) {
  const metadata = {
    title: extractTitle(fileName),
    author: '未知作者',
    description: '',
    cover: null
  };

  // 尝试从内容中提取元数据
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length > 0) {
    // 第一行可能是标题
    const firstLine = lines[0].trim();
    if (firstLine.length < 50 && !/[，。！？；：""''（）]/.test(firstLine)) {
      metadata.title = firstLine;
    }

    // 查找作者信息
    for (const line of lines.slice(0, 20)) {
      const authorMatch = line.match(/作者[：:]\s*(.+)/);
      if (authorMatch) {
        metadata.author = authorMatch[1].trim();
        break;
      }
    }
  }

  return metadata;
}

/**
 * 从文件名提取标题
 */
function extractTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

/**
 * 计算阅读时间
 */
function estimateReadingTime(content) {
  if (!content) return 0;

  const wordCount = content.length;
  const wordsPerMinute = 500; // 平均阅读速度
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  if (minutes < 60) {
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
  }
}

/**
 * 生成目录
 */
function generateTableOfContents(chapters) {
  return chapters.map((chapter, index) => ({
    id: index + 1,
    title: chapter.title,
    level: 1,
    children: []
  }));
}

/**
 * 搜索文本
 */
function searchText(content, keyword) {
  if (!content || !keyword) return [];

  const results = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      results.push({
        line: index + 1,
        content: line.trim(),
        keyword: keyword
      });
    }
  });

  return results;
}

/**
 * 高亮关键词
 */
function highlightKeywords(text, keyword) {
  if (!text || !keyword) return text;

  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

module.exports = {
  parseTXT,
  parseEPUB,
  parsePDF,
  parseMOBI,
  splitChapters,
  extractMetadata,
  extractTitle,
  estimateReadingTime,
  generateTableOfContents,
  searchText,
  highlightKeywords
};
