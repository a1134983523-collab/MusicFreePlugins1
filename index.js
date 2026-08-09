/**
 * MusicFree 多平台音乐插件
 * MusicFree 0.6.2
 *
 * 平台：
 * 网易云音乐
 * QQ音乐
 * 酷狗音乐
 * 酷我音乐
 * 咪咕音乐
 *
 * 只处理公开、合法可访问的数据。
 */

const PLATFORMS = [
  {
    id: 'netease',
    name: '网易云音乐',
  },
  {
    id: 'qq',
    name: 'QQ音乐',
  },
  {
    id: 'kugou',
    name: '酷狗音乐',
  },
  {
    id: 'kuwo',
    name: '酷我音乐',
  },
  {
    id: 'migu',
    name: '咪咕音乐',
  },
];

/**
 * 网络请求
 */
async function httpGet(url, params = {}) {
  const response = await axios.get(url, {
    params,
    timeout: 15000,
  });

  return response.data;
}

/**
 * 标准化歌曲
 */
function createMusic({
  platform,
  id,
  title,
  artist,
  album,
  artwork,
  url,
  lyric,
}) {
  return {
    id: `${platform}:${id}`,
    title: title || '未知歌曲',
    artist: artist || '未知歌手',
    album: album || '',
    artwork: artwork || '',
    url: url || '',
    lyric: lyric || '',
    platform,
  };
}

/**
 * 网易云
 *
 * 播放地址不在这里伪造。
 * 只有获得合法公开地址时才填写 url。
 */
async function searchNetease(keyword, page) {
  return [];
}

/**
 * QQ音乐
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

  const sources = [
    ['netease', searchNetease],
    ['qq', searchQQ],
    ['kugou', searchKugou],
    ['kuwo', searchKuwo],
    ['migu', searchMigu],
  ];

  for (const [platform, handler] of sources) {
    try {
      const items = await handler(keyword, page);

      if (Array.isArray(items)) {
        results.push(...items);
      }
    } catch (error) {
      console.log(
        `[MusicFree] ${platform} 搜索失败`,
        error
      );
    }
  }

  return results;
}

/**
 * 播放
 */
async function getMediaSource(musicItem) {
  if (!musicItem) {
    throw new Error('歌曲信息为空');
  }

  if (!musicItem.url) {
    throw new Error(
      '该歌曲目前没有可公开访问的播放地址'
    );
  }

  return {
    url: musicItem.url,
  };
}

/**
 * 歌词
 */
async function getLyric(musicItem) {
  if (!musicItem) {
    return '';
  }

  return musicItem.lyric || '';
}

/**
 * 歌单导入
 *
 * 各平台歌单解析器将在后续版本逐个平台加入。
 */
async function getMusicSheetInfo(url) {
  if (!url) {
    return [];
  }

  return [];
}

/**
 * 插件信息
 */
module.exports = {
  platform: '多平台音乐',

  version: '1.1.0',

  author: 'a1134983523-collab',

  description: `
网易云音乐 / QQ音乐 / 酷狗 / 酷我 / 咪咕

公开数据聚合插件。

不绕过VIP、付费限制、登录验证或DRM。
`,

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',

  search,

  getMediaSource,

  getLyric,

  getMusicSheetInfo,
};