const axios = require('axios');

/*
 * MusicFree
 * 外部歌单导入 V1
 *
 * 支持：
 * 1. 网易云音乐歌单
 * 2. QQ音乐歌单
 * 3. 自动识别平台
 * 4. QQ歌曲自动匹配网易云
 *
 * MusicFree 0.6.x
 */

const NETEASE_API =
  'https://music.163.com';

const QQ_API =
  'https://c.y.qq.com';

const TIMEOUT = 10000;


/* =========================================================
 * 基础工具
 * ========================================================= */

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

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}


/* =========================================================
 * 歌手处理
 * ========================================================= */

function getNeteaseArtists(song) {

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


/* =========================================================
 * 平台识别
 * ========================================================= */

function detectPlatform(url) {

  const value =
    text(url).toLowerCase();

  /*
   * 网易云
   */
  if (
    value.includes('music.163.com') ||
    value.includes('163cn.tv')
  ) {
    return 'netease';
  }

  /*
   * QQ音乐
   */
  if (
    value.includes('qq.com') ||
    value.includes('y.qq.com') ||
    value.includes('i.y.qq.com')
  ) {
    return 'qq';
  }

  return null;
}


/* =========================================================
 * 网易云歌单 ID
 * ========================================================= */

function parseNeteasePlaylistId(url) {

  const value =
    text(url);

  let match;

  /*
   * playlist?id=123
   */
  match =
    value.match(
      /[?&]id=(\d+)/i
    );

  if (match) {
    return match[1];
  }

  /*
   * playlist/123
   */
  match =
    value.match(
      /playlist[\/_-](\d+)/i
    );

  if (match) {
    return match[1];
  }

  /*
   * #/playlist?id=123
   */
  match =
    value.match(
      /playlist.*?[?&]id=(\d+)/i
    );

  if (match) {
    return match[1];
  }

  return null;
}


/* =========================================================
 * QQ歌单 ID
 * ========================================================= */

function parseQQPlaylistId(url) {

  const value =
    text(url);

  let match;

  /*
   * disstid=123
   */
  match =
    value.match(
      /[?&]disstid=(\d+)/i
    );

  if (match) {
    return match[1];
  }

  /*
   * playlist/123
   */
  match =
    value.match(
      /playlist[\/_-](\d+)/i
    );

  if (match) {
    return match[1];
  }

  /*
   * detail/123
   */
  match =
    value.match(
      /detail[\/_-](\d+)/i
    );

  if (match) {
    return match[1];
  }

  /*
   * id=123
   */
  match =
    value.match(
      /[?&]id=(\d+)/i
    );

  if (match) {
    return match[1];
  }

  return null;
}


/* =========================================================
 * 网易云歌曲转换
 * ========================================================= */

function convertNeteaseSong(song) {

  if (
    !song ||
    song.id == null
  ) {
    return null;
  }

  return {

    id:
      String(song.id),

    title:
      text(song.name),

    artist:
      getNeteaseArtists(song),

    album:
      song.al &&
      song.al.name
        ? song.al.name
        : '',

    artwork:
      song.al &&
      song.al.picUrl
        ? song.al.picUrl
        : '',

    duration:
      song.dt
        ? Math.floor(
            song.dt / 1000
          )
        : undefined,

    platform:
      '网易云音乐'
  };
}


/* =========================================================
 * 网易云歌单
 * ========================================================= */

async function fetchNeteasePlaylist(
  playlistId
) {

  const response =
    await axios.get(
      NETEASE_API +
        '/api/playlist/detail',
      {
        params: {
          id:
            playlistId
        },

        timeout:
          TIMEOUT,

        headers: {
          'User-Agent':
            'Mozilla/5.0'
        }
      }
    );

  const result =
    response.data;

  if (
    !result ||
    !result.result
  ) {
    throw new Error(
      '网易云歌单不存在或无法访问'
    );
  }

  const playlist =
    result.result;

  const tracks =
    Array.isArray(
      playlist.tracks
    )
      ? playlist.tracks
      : [];

  const songs =
    tracks
      .map(
        convertNeteaseSong
      )
      .filter(Boolean);

  return {

    name:
      playlist.name ||
      '网易云歌单',

    artwork:
      playlist.coverImgUrl ||
      '',

    songs:
      songs
  };
}


/* =========================================================
 * QQ歌单获取
 * ========================================================= */

async function fetchQQPlaylist(
  playlistId
) {

  /*
   * QQ公开歌单接口。
   *
   * 这个接口可能随QQ页面改版变化。
   */

  const response =
    await axios.get(
      QQ_API +
        '/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg',
      {

        params: {

          type:
            1,

          json:
            1,

          utf8:
            1,

          onlysong:
            0,

          disstid:
            playlistId,

          format:
            'json',

          g_tk:
            5381
        },

        timeout:
          TIMEOUT,

        headers: {

          Referer:
            'https://y.qq.com/',

          'User-Agent':
            'Mozilla/5.0'
        },

        responseType:
          'text'
      }
    );

  let data =
    response.data;

  /*
   * QQ接口有时会返回：
   *
   * MusicJsonCallback(...)
   */
  if (
    typeof data === 'string'
  ) {

    data =
      data
        .replace(
          /^MusicJsonCallback\(/,
          ''
        )
        .replace(
          /\);?\s*$/,
          ''
        );

    try {
      data =
        JSON.parse(data);
    } catch (e) {
      throw new Error(
        'QQ歌单数据解析失败'
      );
    }
  }

  if (
    !data
  ) {
    throw new Error(
      'QQ歌单没有返回数据'
    );
  }

  /*
   * 兼容不同返回结构。
   */

  let cdlist =
    data.cdlist;

  if (
    !Array.isArray(cdlist) ||
    !cdlist.length
  ) {

    if (
      data.cdlist &&
      typeof data.cdlist === 'object'
    ) {

      cdlist = [
        data.cdlist
      ];
    }
  }

  if (
    !Array.isArray(cdlist) ||
    !cdlist.length
  ) {

    throw new Error(
      'QQ歌单为空或接口不可访问'
    );
  }

  const playlist =
    cdlist[0];

  const list =
    Array.isArray(
      playlist.songlist
    )
      ? playlist.songlist
      : [];

  return {

    name:
      playlist.dissname ||
      playlist.title ||
      'QQ音乐歌单',

    artwork:
      playlist.logo ||
      '',

    songs:
      list
        .map(function (song) {

          const singers =
            Array.isArray(
              song.singer
            )
              ? song.singer
                  .map(function (item) {
                    return item &&
                      item.name
                      ? item.name
                      : '';
                  })
                  .filter(Boolean)
                  .join(' / ')
              : '';

          return {

            mid:
              text(
                song.mid
              ),

            title:
              text(
                song.songname
              ),

            artist:
              singers,

            album:
              song.album &&
              song.album.name
                ? song.album.name
                : '',

            artwork:
              song.album &&
              song.album.mid
                ? (
                    'https://y.gtimg.cn/music/photo_new/T002R300x300M000' +
                    song.album.mid +
                    '.jpg'
                  )
                : ''
          };
        })
        .filter(function (song) {
          return (
            song.title &&
            song.artist
          );
        })
  };
}


/* =========================================================
 * 网易云搜索
 *
 * 用于把 QQ歌曲自动匹配成网易云歌曲。
 * ========================================================= */

async function searchNeteaseSong(
  title,
  artist
) {

  const keyword =
    text(title) +
    ' ' +
    text(artist);

  try {

    const response =
      await axios.get(
        NETEASE_API +
          '/api/search/get/web',
        {

          params: {

            s:
              keyword,

            type:
              1,

            offset:
              0,

            total:
              true,

            limit:
              20
          },

          timeout:
            TIMEOUT,

          headers: {

            'User-Agent':
              'Mozilla/5.0'
          }
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
      return null;
    }

    const songs =
      result.result.songs;

    const wantedTitle =
      normalize(title);

    const wantedArtist =
      normalize(artist);

    let best =
      null;

    let bestScore =
      -Infinity;

    songs.forEach(function (song) {

      const songTitle =
        normalize(song.name);

      const songArtist =
        normalize(
          getNeteaseArtists(song)
        );

      let score =
        0;

      /*
       * 歌名完全匹配
       */
      if (
        songTitle ===
        wantedTitle
      ) {
        score +=
          10000;
      }

      /*
       * 歌名包含
       */
      else if (
        songTitle.includes(
          wantedTitle
        ) ||
        wantedTitle.includes(
          songTitle
        )
      ) {
        score +=
          5000;
      }

      /*
       * 歌手完全匹配
       */
      if (
        songArtist ===
        wantedArtist
      ) {
        score +=
          10000;
      }

      /*
       * 歌手包含
       */
      else if (
        songArtist.includes(
          wantedArtist
        ) ||
        wantedArtist.includes(
          songArtist
        )
      ) {
        score +=
          5000;
      }

      /*
       * 双方都命中，
       * 给巨大奖励。
       */
      if (
        songTitle ===
          wantedTitle &&
        songArtist.includes(
          wantedArtist
        )
      ) {
        score +=
          15000;
      }

      /*
       * 排除明显不同版本。
       */
      const version =
        (
          text(song.name) +
          ' ' +
          text(
            song.al &&
            song.al.name
          )
        ).toLowerCase();

      if (
        version.includes(
          'live'
        ) ||
        version.includes(
          '现场'
        ) ||
        version.includes(
          'remix'
        ) ||
        version.includes(
          'dj'
        ) ||
        version.includes(
          '伴奏'
        ) ||
        version.includes(
          '翻唱'
        )
      ) {
        score -=
          3000;
      }

      if (
        score >
        bestScore
      ) {

        bestScore =
          score;

        best =
          song;
      }
    });

    /*
     * 最低匹配分。
     *
     * 防止：
     * QQ歌单一首歌
     * 被错误匹配成完全不同的网易云歌曲。
     */
    if (
      !best ||
      bestScore < 10000
    ) {
      return null;
    }

    return convertNeteaseSong(
      best
    );

  } catch (error) {

    console.log(
      '[QQ → 网易云] 匹配失败:',
      error &&
      error.message
        ? error.message
        : error
    );

    return null;
  }
}


/* =========================================================
 * 批量匹配
 *
 * 不一次性打爆网易云接口。
 * 每首之间稍微等待。
 * ========================================================= */

async function matchQQSongs(
  songs
) {

  const result =
    [];

  for (
    let i = 0;
    i < songs.length;
    i++
  ) {

    const song =
      songs[i];

    try {

      const matched =
        await searchNeteaseSong(
          song.title,
          song.artist
        );

      if (
        matched
      ) {

        result.push(
          matched
        );
      }

    } catch (e) {

      console.log(
        '[匹配失败]',
        song.title
      );
    }

    /*
     * 避免连续请求过快。
     */
    if (
      i <
      songs.length - 1
    ) {
      await sleep(120);
    }
  }

  return result;
}


/* =========================================================
 * 去重
 * ========================================================= */

function deduplicate(
  songs
) {

  const map =
    {};

  const result =
    [];

  songs.forEach(function (song) {

    const key =
      String(
        song.id
      );

    if (
      !key ||
      map[key]
    ) {
      return;
    }

    map[key] =
      true;

    result.push(
      song
    );
  });

  return result;
}


/* =========================================================
 * MusicFree 插件
 * ========================================================= */

module.exports = {

  /*
   * 这里保持网易云平台。
   *
   * 因为QQ歌曲最终会自动匹配成网易云歌曲。
   */
  platform:
    '网易云音乐',

  version:
    '1.0.0',

  author:
    'a1134983523-collab',

  appVersion:
    '>=0.6.0',

  description:
    '网易云/QQ音乐外部歌单导入与自动匹配',

  /*
   * 歌单导入提示。
   */
  hints: {

    importMusicSheet:
      '粘贴网易云或QQ音乐歌单链接，插件会自动识别并导入；QQ音乐歌单会自动匹配到网易云。'
  },


  /* =======================================================
   * 导入歌单
   * ======================================================= */

  async importMusicSheet(
    urlLike
  ) {

    const url =
      text(urlLike);

    if (!url) {
      return [];
    }

    /*
     * 自动识别平台。
     */
    const platform =
      detectPlatform(url);

    if (
      platform ===
      'netease'
    ) {

      /*
       * ==========================
       * 网易云歌单
       * ==========================
       */

      const playlistId =
        parseNeteasePlaylistId(
          url
        );

      if (!playlistId) {

        throw new Error(
          '无法识别网易云歌单 ID'
        );
      }

      const playlist =
        await fetchNeteasePlaylist(
          playlistId
        );

      /*
       * 直接返回网易云歌曲。
       */
      return deduplicate(
        playlist.songs
      );
    }


    if (
      platform ===
      'qq'
    ) {

      /*
       * ==========================
       * QQ音乐歌单
       * ==========================
       */

      const playlistId =
        parseQQPlaylistId(
          url
        );

      if (!playlistId) {

        throw new Error(
          '无法识别QQ音乐歌单 ID'
        );
      }

      const playlist =
        await fetchQQPlaylist(
          playlistId
        );

      /*
       * QQ歌曲：
       *
       * 自动搜索网易云对应歌曲。
       */
      const matched =
        await matchQQSongs(
          playlist.songs
        );

      return deduplicate(
        matched
      );
    }


    /*
     * ==========================
     * 通用链接识别失败
     * ==========================
     */

    throw new Error(
      '暂不支持这个链接。请粘贴网易云或QQ音乐歌单链接。'
    );
  }
};