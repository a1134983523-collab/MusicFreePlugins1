const axios = require('axios');

const API = 'https://www.cyanyun.com/api';
const PLATFORM = '网易云音乐';

const TIMEOUT = 8000;

/* =========================
 * 基础工具
 * ========================= */

function text(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return text(value)
    .toLowerCase()
    .replace(/[\u3000\s]+/g, '')
    .replace(/[《》「」『』【】（）()[\]{}<>]/g, '')
    .replace(/[·•・,，.。!！?？:：;；/\\|_-]/g, '');
}

function getArtists(song) {
  if (Array.isArray(song.ar)) {
    return song.ar
      .map(function (item) {
        return item && item.name
          ? item.name
          : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  if (Array.isArray(song.artists)) {
    return song.artists
      .map(function (item) {
        return item && item.name
          ? item.name
          : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  return '';
}

function getAlbum(song) {
  if (
    song.al &&
    song.al.name
  ) {
    return song.al.name;
  }

  if (
    song.album &&
    song.album.name
  ) {
    return song.album.name;
  }

  return '';
}

function getArtwork(song) {
  if (
    song.al &&
    song.al.picUrl
  ) {
    return song.al.picUrl;
  }

  if (
    song.album &&
    song.album.picUrl
  ) {
    return song.album.picUrl;
  }

  return '';
}

/* =========================
 * 版本判断
 * ========================= */

function getVersionText(song) {
  return (
    text(song.name) +
    ' ' +
    getAlbum(song)
  ).toLowerCase();
}

function isLive(song) {
  const s = getVersionText(song);

  return (
    s.includes('live') ||
    s.includes('现场') ||
    s.includes('演唱会')
  );
}

function isRemix(song) {
  const s = getVersionText(song);

  return (
    s.includes('remix') ||
    s.includes('混音') ||
    s.includes('重混')
  );
}

function isDJ(song) {
  const s = getVersionText(song);

  return (
    s.includes('dj') ||
    s.includes('电音')
  );
}

function isInstrumental(song) {
  const s = getVersionText(song);

  return (
    s.includes('伴奏') ||
    s.includes('instrumental') ||
    s.includes('纯音乐')
  );
}

function isCover(song) {
  const s = getVersionText(song);

  return (
    s.includes('翻唱') ||
    s.includes('cover')
  );
}

/* =========================
 * 搜索评分
 * ========================= */

function scoreSong(song, keyword) {
  const q = normalize(keyword);

  const title = normalize(song.title);
  const artist = normalize(song.artist);
  const album = normalize(song.album);

  if (!q) {
    return 0;
  }

  let score = 0;

  /* 歌名完全匹配 */
  if (title === q) {
    score += 20000;
  }

  /* 歌名包含 */
  else if (title.includes(q)) {
    score += 10000;
  }

  /* 歌手完全匹配 */
  if (artist === q) {
    score += 7000;
  }

  /* 歌手包含 */
  else if (artist.includes(q)) {
    score += 4000;
  }

  /* 专辑 */
  if (album === q) {
    score += 2000;
  }

  else if (album.includes(q)) {
    score += 500;
  }

  /*
   * 多关键词：
   *
   * 周杰伦 七里香
   */
  const words = text(keyword)
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 1) {

    let matched = 0;

    words.forEach(function (word) {

      const w = normalize(word);

      if (!w) {
        return;
      }

      if (title.includes(w)) {
        score += 3500;
        matched++;
      }

      else if (artist.includes(w)) {
        score += 3500;
        matched++;
      }

      else if (album.includes(w)) {
        score += 500;
        matched++;
      }
    });

    if (matched === words.length) {
      score += 10000;
    }

    else if (matched === 0) {
      score -= 20000;
    }
  }

  /*
   * 原版优先。
   */
  if (isLive(song)) {
    score -= 3500;
  }

  if (isRemix(song)) {
    score -= 3500;
  }

  if (isDJ(song)) {
    score -= 4000;
  }

  if (isInstrumental(song)) {
    score -= 3500;
  }

  if (isCover(song)) {
    score -= 3000;
  }

  /*
   * 有专辑封面稍微加分。
   */
  if (song.artwork) {
    score += 100;
  }

  return score;
}

/* =========================
 * 转换 MusicFree 歌曲
 * ========================= */

function convertSong(song) {

  if (
    !song ||
    song.id === undefined ||
    song.id === null
  ) {
    return null;
  }

  /*
   * 这里非常重要：
   *
   * id 永远使用网易云原始 ID。
   *
   * 不再创建 neteaseId
   * 作为第二套 ID。
   */
  const item = {

    id: String(song.id),

    platform: PLATFORM,

    title:
      text(song.name),

    artist:
      getArtists(song),

    album:
      getAlbum(song),

    artwork:
      getArtwork(song),

    duration:
      song.dt
        ? Math.floor(
            song.dt / 1000
          )
        : undefined
  };

  /*
   * 如果接口直接给 URL，
   * 保存为默认音源。
   */
  if (
    typeof song.url === 'string' &&
    song.url
  ) {
    item.url = song.url;
  }

  /*
   * 保存网易云歌曲状态。
   */
  if (
    song.fee !== undefined
  ) {
    item.fee = song.fee;
  }

  if (
    song.privilege
  ) {
    item.privilege =
      song.privilege;
  }

  return item;
}

/* =========================
 * 去重
 * ========================= */

function deduplicate(list) {

  const map = {};
  const result = [];

  list.forEach(function (song) {

    /*
     * 优先使用网易云 ID。
     */
    const key =
      String(song.id);

    if (!key) {
      return;
    }

    if (map[key]) {
      return;
    }

    map[key] = true;

    result.push(song);
  });

  return result;
}

/* =========================
 * 排序
 * ========================= */

function rankSongs(list, keyword) {

  return list
    .map(function (song, index) {

      return {
        song: song,

        score:
          scoreSong(
            song,
            keyword
          ),

        index: index
      };
    })

    .sort(function (a, b) {

      if (
        b.score !== a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        a.index -
        b.index
      );
    })

    .map(function (item) {
      return item.song;
    });
}

/* =========================
 * 空结果
 * ========================= */

function emptyResult() {

  return {
    isEnd: true,
    data: []
  };
}

/* =========================
 * 播放 URL 提取
 * ========================= */

function extractUrl(response) {

  if (
    !response ||
    !response.data
  ) {
    return null;
  }

  const body =
    response.data;

  /*
   * 常见：
   *
   * {
   *   data: [
   *     { url: "..." }
   *   ]
   * }
   */
  if (
    Array.isArray(body.data)
  ) {

    for (
      let i = 0;
      i < body.data.length;
      i++
    ) {

      const item =
        body.data[i];

      if (
        item &&
        typeof item.url === 'string' &&
        item.url
      ) {
        return item.url;
      }
    }
  }

  /*
   * 少数接口：
   *
   * { url: "..." }
   */
  if (
    typeof body.url === 'string' &&
    body.url
  ) {
    return body.url;
  }

  return null;
}

/* =========================
 * 插件
 * ========================= */

module.exports = {

  platform:
    PLATFORM,

  version:
    '9.0.0',

  author:
    'a1134983523-collab',

  description:
    '网易云音乐精准搜索与公开音源',

  srcUrl:
    'https://raw.githubusercontent.com/a1134983523-collab/MusicFreePlugins1/main/index.js',

  /* =======================
   * 搜索
   * ======================= */

  async search(
    keyword,
    page,
    type
  ) {

    if (!keyword) {
      return emptyResult();
    }

    page =
      page || 1;

    /*
     * 只处理歌曲搜索。
     */
    if (
      type &&
      type !== 'music'
    ) {
      return emptyResult();
    }

    try {

      const response =
        await axios.get(
          API + '/search',
          {
            params: {

              keywords:
                keyword,

              limit:
                50,

              offset:
                (page - 1) * 50,

              type:
                1
            },

            timeout:
              TIMEOUT
          }
        );

      const result =
        response.data;

      if (
        !result ||
        !result.result ||
        !Array.isArray(
          result.result.songs
        )
      ) {
        return emptyResult();
      }

      let songs =
        result.result.songs
          .map(convertSong)
          .filter(Boolean);

      /*
       * 去重。
       */
      songs =
        deduplicate(songs);

      /*
       * 精确排序。
       */
      songs =
        rankSongs(
          songs,
          keyword
        );

      /*
       * 返回 30 首。
       */
      songs =
        songs.slice(
          0,
          30
        );

      return {

        isEnd:
          songs.length < 30,

        data:
          songs
      };

    } catch (error) {

      console.log(
        '[网易云] 搜索失败:',
        error &&
        error.message
          ? error.message
          : error
      );

      return emptyResult();
    }
  },

  /* =======================
   * 播放
   * ======================= */

  async getMediaSource(
    musicItem
  ) {

    if (!musicItem) {
      return null;
    }

    /*
     * 如果搜索结果已经带有
     * 默认播放地址，优先使用。
     */
    if (
      typeof musicItem.url === 'string' &&
      musicItem.url
    ) {

      return {
        url:
          musicItem.url
      };
    }

    /*
     * 必须使用 MusicFree 的
     * 原始 id。
     */
    const id =
      musicItem.id;

    if (!id) {
      return null;
    }

    /*
     * 第一优先：
     *
     * /song/url/v1
     */
    try {

      const response =
        await axios.get(
          API +
            '/song/url/v1',
          {
            params: {

              id:
                String(id),

              level:
                'standard'
            },

            timeout:
              TIMEOUT
          }
        );

      const url =
        extractUrl(
          response
        );

      if (url) {

        return {
          url:
            url
        };
      }

    } catch (error) {

      console.log(
        '[网易云] v1 获取失败'
      );
    }

    /*
     * 第二优先：
     *
     * /song/url
     */
    try {

      const response =
        await axios.get(
          API +
            '/song/url',
          {
            params: {

              id:
                String(id)
            },

            timeout:
              TIMEOUT
          }
        );

      const url =
        extractUrl(
          response
        );

      if (url) {

        return {
          url:
            url
        };
      }

    } catch (error) {

      console.log(
        '[网易云] url 获取失败'
      );
    }

    /*
     * 没有公开播放地址。
     */
    return null;
  },

  /* =======================
   * 歌词
   * ======================= */

  async getLyric(
    musicItem
  ) {

    if (!musicItem) {
      return null;
    }

    const id =
      musicItem.id;

    if (!id) {
      return null;
    }

    try {

      const response =
        await axios.get(
          API +
            '/song/lyric',
          {
            params: {

              id:
                String(id)
            },

            timeout:
              TIMEOUT
          }
        );

      const result =
        response.data;

      if (
        !result ||
        !result.lrc ||
        !result.lrc.lyric
      ) {
        return null;
      }

      return {

        rawLrc:
          result.lrc.lyric,

        translation:
          result.tlyric &&
          result.tlyric.lyric
            ? result.tlyric.lyric
            : undefined
      };

    } catch (error) {

      console.log(
        '[网易云] 歌词获取失败'
      );

      return null;
    }
  }
};