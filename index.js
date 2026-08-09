/**
 * MusicFree Multi-Source
 * MusicFree 0.6.2
 *
 * 网易云 / QQ音乐 / 酷狗 / 酷我 / 咪咕
 *
 * 说明：
 * 这里只使用公开可访问的数据。
 * 不绕过 VIP、付费限制、登录验证或 DRM。
 */

const PLATFORMS = {
  netease: {
    name: '网易云音乐',
    enabled: true,
  },

  qq: {
    name: 'QQ音乐',
    enabled: true,
  },

  kugou: {
    name: '酷狗音乐',
    enabled: true,
  },

  kuwo: {
    name: '酷我音乐',
    enabled: true,
  },

  migu: {
    name: '咪咕音乐',
    enabled: true,
  },
};

/**
 * 统一歌曲对象
 */
function music({
  id,
  title,
  artist,
  album,
  cover,
  url,
  lyric,
  platform,
}) {
  return {
    id: String(id),
    title: title || '未知歌曲',
    artist: artist || '未知歌手',
    album: album || '',
    artwork: cover || '',
    url: url || '',
    lyric: lyric || '',
    platform: platform || '',
  };
}

/**
 * 根据平台名称生成唯一 ID
 */
function makeId(platform, id) {
  return `${platform}:${id}`;
}

/**
 * 网络请求封装
 */
async function request(url, options = {}) {
  if (typeof axios !== 'undefined') {
    const response = await axios({
      url,
      method: options.method || 'GET',
      params: options.params,
      data: options.data,
      headers: options.headers,
      timeout: 15000,
    });

    return response.data;
  }

  throw new Error('当前 MusicFree 环境没有可用的网络请求模块');
}

/**
 * 网易云
 *
 * 这里暂时不硬编码第三方破解 API。
 * 后续接入经过确认的公开接口。
 */
async function searchNetease(keyword, page) {
  return [];
}

/**
 * QQ 音乐
 */
async function searchQQ(keyword, page) {
  return [];
}

/**
 * 酷狗
 */
async function searchKugou(keyword, page) {
  return [];
}

/**
 * 酷我
 */
async function searchKuwo(keyword, page) {
  return [];
}

/**
 * 咪咕
 */
async function searchMigu(keyword, page) {
  return [];
}

/**
 * 多平台搜索
 */
async function search(keyword, page = 1, type = 'music') {
  if (!keyword) {
    return [];
  }

  const results = [];

  const tasks = [
    ['netease', searchNetease],
    ['qq', searchQQ],
    ['kugou', searchKugou],
    ['kuwo', searchKuwo],
    ['migu', searchMigu],
  ];

  for (const [platform, fn] of tasks) {
    try {
      if (!PLATFORMS[platform].enabled) {
        continue;
      }

      const data = await fn(keyword, page);

      if (Array.isArray(data)) {
        results.push(...data);
      }
    } catch (error) {
      console.log(
        `[MusicFree] ${PLATFORMS[platform].name} 搜索失败`,
        error
      );
    }
  }

  return results;
}

/**
 * 获取播放地址
 */
async function getMediaSource(musicItem) {
  if (!musicItem) {
    throw new Error('歌曲信息为空');
  }

  if (!musicItem.url) {
    throw new Error(
      `${musicItem.platform || '当前音源'}没有公开可用的播放地址`
    );
  }

  return {
    url: musicItem.url,
  };
}

/**
 * 获取歌词
 */
async function getLyric(musicItem) {
  if (!musicItem) {
    return '';
  }

  return musicItem.lyric || '';
}

/**
 * 导入歌单
 *
 * 当前先支持将标准歌曲数组交给 MusicFree。
 * 各平台 URL 解析器后续逐个加入。
 */
async function getMusicSheetInfo(url) {
  if (!url) {
    return [];
  }

  return [];
}

/**
 * 插件导出
 */
module.exports = {
  platform: '多平台音乐聚合',

  version: '1.0.0',

  author: 'a1134983523-collab',

  description: `
支持网易云音乐、QQ音乐、酷狗音乐、酷我音乐、咪咕音乐。

当前版本仅使用公开可访问的数据，
不绕过VIP、付费限制、登录验证或DRM。

后续逐个平台加入公开搜索、歌词、歌单和播放地址。
`,

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',

  search,

  getMediaSource,

  getLyric,

  getMusicSheetInfo,
};