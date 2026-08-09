const axios = require('axios');

/*
 * 网易云音乐 MusicFree 插件
 * MusicFree 0.6.2
 *
 * 重点：
 * 1. 网易云搜索
 * 2. 精确匹配优先
 * 3. 歌名 + 歌手联合匹配
 * 4. 去除明显无关结果
 * 5. 去重
 * 6. 封面
 * 7. 歌词
 * 8. 公开可访问播放地址
 */

const API = 'https://www.cyanyun.com/api';

const PLATFORM = '网易云音乐';


// ==============================
// 文本处理
// ==============================

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u3000\s]+/g, '')
    .replace(/[《》「」『』【】（）()［］[\]{}<>]/g, '')
    .replace(/[·•・,，.。!！?？:：;；/\\|_-]/g, '');
}


function contains(text, keyword) {
  return normalize(text).indexOf(
    normalize(keyword)
  ) !== -1;
}


// ==============================
// 获取歌手
// ==============================

function getArtist(song) {
  if (
    song &&
    Array.isArray(song.ar)
  ) {
    return song.ar
      .map(function (item) {
        return item && item.name
          ? item.name
          : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  if (
    song &&
    Array.isArray(song.artists)
  ) {
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


// ==============================
// 获取专辑
// ==============================

function getAlbum(song) {
  if (
    song &&
    song.al &&
    song.al.name
  ) {
    return song.al.name;
  }

  if (
    song &&
    song.album &&
    song.album.name
  ) {
    return song.album.name;
  }

  return '';
}


// ==============================
// 获取封面
// ==============================

function getArtwork(song) {
  if (
    song &&
    song.al &&
    song.al.picUrl
  ) {
    return song.al.picUrl;
  }

  if (
    song &&
    song.album &&
    song.album.picUrl
  ) {
    return song.album.picUrl;
  }

  return '';
}


// ==============================
// 转换歌曲
// ==============================

function convertSong(song) {
  if (
    !song ||
    song.id === undefined ||
    song.id === null
  ) {
    return null;
  }

  return {
    id: String(song.id),

    platform: PLATFORM,

    title: song.name || '',

    artist: getArtist(song),

    album: getAlbum(song),

    artwork: getArtwork(song),

    duration: song.dt
      ? Math.floor(song.dt / 1000)
      : 0,

    neteaseId: String(song.id),
  };
}


// ==============================
// 判断是否是特殊版本
// ==============================

function isSpecialVersion(song) {
  const text =
    (
      String(song.title || '') +
      ' ' +
      String(song.album || '')
    ).toLowerCase();

  const words = [
    'live',
    '现场',
    '演唱会',
    'remix',
    '混音',
    'dj',
    'demo',
    '伴奏',
    'instrumental',
    '纯音乐',
    '翻唱',
    'cover',
    '重混',
    '现场版',
    '演奏版',
  ];

  return words.some(function (word) {
    return text.indexOf(word) !== -1;
  });
}


// ==============================
// 解析用户搜索
// ==============================

function parseQuery(query) {
  const raw =
    String(query || '').trim();

  const parts =
    raw.split(/\s+/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);

  return {
    raw: raw,
    normalized: normalize(raw),
    parts: parts,
  };
}


// ==============================
// 搜索评分
// ==============================

function scoreSong(song, queryInfo) {
  const title =
    normalize(song.title);

  const artist =
    normalize(song.artist);

  const album =
    normalize(song.album);

  const query =
    queryInfo.normalized;

  let score = 0;

  if (!query) {
    return 0;
  }


  /*
   * 最重要：
   * 歌名完全匹配
   */
  if (title === query) {
    score += 10000;
  }


  /*
   * 歌名包含完整搜索词
   */
  else if (
    title.indexOf(query) !== -1
  ) {
    score += 7000;
  }


  /*
   * 歌手完全匹配
   */
  if (artist === query) {
    score += 5000;
  }


  /*
   * 歌手包含搜索词
   */
  else if (
    artist.indexOf(query) !== -1
  ) {
    score += 3000;
  }


  /*
   * 专辑匹配
   */
  if (album === query) {
    score += 2000;
  }

  else if (
    album.indexOf(query) !== -1
  ) {
    score += 800;
  }


  /*
   * 用户输入了：
   *
   * 周杰伦 七里香
   *
   * 分别检查每一个关键词。
   */
  if (queryInfo.parts.length > 1) {

    let matched = 0;

    queryInfo.parts.forEach(
      function (part) {

        const p =
          normalize(part);

        if (!p) {
          return;
        }

        if (
          title.indexOf(p) !== -1
        ) {
          score += 2500;
          matched++;
          return;
        }

        if (
          artist.indexOf(p) !== -1
        ) {
          score += 2200;
          matched++;
          return;
        }

        if (
          album.indexOf(p) !== -1
        ) {
          score += 500;
          matched++;
        }
      }
    );


    /*
     * 所有关键词都匹配，
     * 给很高的奖励。
     */
    if (
      matched ===
      queryInfo.parts.length
    ) {
      score += 6000;
    }

    /*
     * 一个关键词都没匹配：
     * 大幅降低。
     */
    if (matched === 0) {
      score -= 10000;
    }
  }


  /*
   * 特殊版本降权。
   *
   * 不直接删除。
   */
  if (isSpecialVersion(song)) {
    score -= 1200;
  }


  /*
   * 有封面稍微加分。
   */
  if (song.artwork) {
    score += 50;
  }


  /*
   * 有专辑稍微加分。
   */
  if (song.album) {
    score += 50;
  }


  return score;
}


// ==============================
// 去重
// ==============================

function deduplicate(songs) {
  const map = {};
  const result = [];

  songs.forEach(function (song) {

    const key =
      normalize(song.title) +
      '|' +
      normalize(song.artist);

    if (!key || key === '|') {
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


// ==============================
// 排序
// ==============================

function rankSongs(songs, query) {

  const queryInfo =
    parseQuery(query);

  const scored =
    songs.map(function (song, index) {

      return {
        song: song,

        score:
          scoreSong(
            song,
            queryInfo
          ),

        index: index,
      };
    });


  scored.sort(function (a, b) {

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
  });


  return scored.map(
    function (item) {
      return item.song;
    }
  );
}


// ==============================
// 过滤低相关结果
// ==============================

function filterSongs(
  songs,
  query
) {

  const queryInfo =
    parseQuery(query);

  const queryText =
    queryInfo.normalized;

  /*
   * 如果查询词非常短，
   * 不进行严格过滤。
   *
   * 例如：
   * A
   * 周
   */
  if (
    queryText.length <= 1
  ) {
    return songs;
  }


  return songs.filter(
    function (song) {

      const title =
        normalize(song.title);

      const artist =
        normalize(song.artist);

      const album =
        normalize(song.album);


      /*
       * 单关键词：
       *
       * 歌名 / 歌手 / 专辑
       * 至少有一个包含查询词。
       */
      if (
        queryInfo.parts.length === 1
      ) {

        return (
          title.indexOf(
            queryText
          ) !== -1 ||

          artist.indexOf(
            queryText
          ) !== -1 ||

          album.indexOf(
            queryText
          ) !== -1
        );
      }


      /*
       * 多关键词：
       *
       * 至少两个关键词命中，
       * 或者歌名完整包含整个查询。
       */
      let matched = 0;

      queryInfo.parts.forEach(
        function (part) {

          const p =
            normalize(part);

          if (
            title.indexOf(p) !== -1 ||
            artist.indexOf(p) !== -1 ||
            album.indexOf(p) !== -1
          ) {
            matched++;
          }
        }
      );


      if (
        title.indexOf(
          queryText
        ) !== -1
      ) {
        return true;
      }


      return matched >= 2;
    }
  );
}


// ==============================
// 空搜索结果
// ==============================

function emptyResult() {
  return {
    isEnd: true,
    data: [],
  };
}


// ==============================
// 插件
// ==============================

module.exports = {

  platform: PLATFORM,

  version: '5.0.0',

  author:
    'a1134983523-collab',

  description:
    '网易云音乐精准搜索版',

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',


  // ============================
  // 搜索
  // ============================

  async search(
    query,
    page,
    type
  ) {

    if (!query) {
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

      /*
       * 一次获取 50 个候选。
       *
       * 候选越多，
       * 排序后的准确率越高。
       */
      const response =
        await axios.get(
          API + '/search',
          {
            params: {

              keywords:
                query,

              limit: 50,

              offset:
                (page - 1) * 50,

              type: 1,
            },

            timeout: 20000,
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


      /*
       * 转换。
       */
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
       * 过滤明显无关结果。
       */
      songs =
        filterSongs(
          songs,
          query
        );


      /*
       * 相关性排序。
       */
      songs =
        rankSongs(
          songs,
          query
        );


      /*
       * 最终返回 30 条。
       */
      songs =
        songs.slice(
          0,
          30
        );


      return {

        isEnd:
          songs.length < 30,

        data: songs,
      };

    } catch (error) {

      console.log(
        '[网易云搜索错误]',
        error &&
        error.message
          ? error.message
          : error
      );

      return emptyResult();
    }
  },


  // ============================
  // 获取播放地址
  // ============================

  async getMediaSource(
    musicItem
  ) {

    const id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }


    try {

      const response =
        await axios.get(
          API + '/song/url',
          {
            params: {
              id: id,
            },

            timeout: 20000,
          }
        );


      const data =
        response.data;


      /*
       * 兼容：
       *
       * data.url
       *
       * data.data[0].url
       */
      if (
        data &&
        data.url
      ) {
        return {
          url: data.url,
        };
      }


      if (
        data &&
        Array.isArray(
          data.data
        ) &&
        data.data.length &&
        data.data[0] &&
        data.data[0].url
      ) {

        return {
          url:
            data.data[0].url,
        };
      }


      return null;

    } catch (error) {

      console.log(
        '[网易云播放地址错误]',
        error
      );

      return null;
    }
  },


  // ============================
  // 获取歌词
  // ============================

  async getLyric(
    musicItem
  ) {

    const id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }


    try {

      const response =
        await axios.get(
          API + '/song/lyric',
          {
            params: {
              id: id,
            },

            timeout: 20000,
          }
        );


      const data =
        response.data;


      if (
        !data ||
        !data.lrc ||
        !data.lrc.lyric
      ) {
        return null;
      }


      return {
        rawLrc:
          data.lrc.lyric,

        translation:
          data.tlyric &&
          data.tlyric.lyric
            ? data.tlyric.lyric
            : undefined,
      };

    } catch (error) {

      console.log(
        '[网易云歌词错误]',
        error
      );

      return null;
    }
  },
};