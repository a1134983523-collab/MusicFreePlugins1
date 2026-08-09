const axios = require('axios');

const API = 'https://api.jimsdeng.eu.org';

const PLATFORM = '网易云音乐';

function emptyResult() {
  return {
    isEnd: true,
    data: [],
  };
}

function getArtist(song) {
  if (!song) return '';

  if (Array.isArray(song.ar)) {
    return song.ar
      .map(function (item) {
        return item && item.name ? item.name : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  if (Array.isArray(song.artists)) {
    return song.artists
      .map(function (item) {
        return item && item.name ? item.name : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  return '';
}

function convertSong(song) {
  if (!song || song.id == null) {
    return null;
  }

  var albumName = '';
  var artwork = '';

  if (song.al) {
    albumName = song.al.name || '';
    artwork = song.al.picUrl || '';
  }

  if (song.album) {
    albumName =
      song.album.name ||
      albumName;

    artwork =
      song.album.picUrl ||
      artwork;
  }

  return {
    id: String(song.id),
    platform: PLATFORM,
    title: song.name || '',
    artist: getArtist(song),
    album: albumName,
    artwork: artwork,
    duration: song.dt
      ? Math.floor(song.dt / 1000)
      : 0,

    // 保存网易云 ID，供后面的接口使用
    neteaseId: String(song.id),
  };
}

module.exports = {
  platform: PLATFORM,

  author: 'a1134983523-collab',

  version: '3.0.0',

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',

  primaryKey: ['id'],

  cacheControl: 'no-cache',

  supportedSearchType: [
    'music',
    'sheet',
    'album',
    'artist',
    'lyric',
  ],

  hints: {
    importMusicSheet: [
      '支持网易云音乐歌单链接。',
      '例如：https://music.163.com/#/playlist?id=123456',
    ],
  },

  async search(query, page, type) {
    if (!query) {
      return emptyResult();
    }

    page = page || 1;

    /*
     * 歌曲搜索
     */
    if (type === 'music') {
      try {
        var response = await axios.get(
          API + '/search',
          {
            params: {
              keywords: query,
              limit: 20,
              offset: (page - 1) * 20,
              type: 1,
            },
            timeout: 20000,
          }
        );

        var result = response.data;

        if (
          !result ||
          !result.result ||
          !Array.isArray(result.result.songs)
        ) {
          return emptyResult();
        }

        var songs = result.result.songs
          .map(convertSong)
          .filter(Boolean);

        return {
          isEnd: songs.length < 20,
          data: songs,
        };
      } catch (e) {
        console.log(
          '[网易云] 搜索失败:',
          e && e.message
            ? e.message
            : e
        );

        return emptyResult();
      }
    }

    /*
     * 歌单搜索
     */
    if (type === 'sheet') {
      try {
        var sheetResponse =
          await axios.get(
            API + '/search',
            {
              params: {
                keywords: query,
                limit: 20,
                offset: (page - 1) * 20,
                type: 1000,
              },
              timeout: 20000,
            }
          );

        var sheetResult =
          sheetResponse.data;

        var playlists =
          sheetResult &&
          sheetResult.result &&
          sheetResult.result.playlists;

        if (!Array.isArray(playlists)) {
          return emptyResult();
        }

        return {
          isEnd: playlists.length < 20,

          data: playlists.map(
            function (item) {
              return {
                id: String(item.id),
                platform: PLATFORM,
                title: item.name || '',
                artist:
                  item.creator &&
                  item.creator.nickname
                    ? item.creator.nickname
                    : '',
                artwork:
                  item.coverImgUrl || '',
                description:
                  item.description || '',
                playCount:
                  item.playCount || 0,
              };
            }
          ),
        };
      } catch (e) {
        console.log(
          '[网易云] 歌单搜索失败:',
          e
        );

        return emptyResult();
      }
    }

    /*
     * 歌手搜索
     */
    if (type === 'artist') {
      try {
        var artistResponse =
          await axios.get(
            API + '/search',
            {
              params: {
                keywords: query,
                limit: 20,
                offset: (page - 1) * 20,
                type: 100,
              },
              timeout: 20000,
            }
          );

        var artistResult =
          artistResponse.data;

        var artists =
          artistResult &&
          artistResult.result &&
          artistResult.result.artists;

        if (!Array.isArray(artists)) {
          return emptyResult();
        }

        return {
          isEnd: artists.length < 20,

          data: artists.map(
            function (item) {
              return {
                id: String(item.id),
                platform: PLATFORM,
                name: item.name || '',
                avatar:
                  item.picUrl ||
                  item.img1v1Url ||
                  '',
              };
            }
          ),
        };
      } catch (e) {
        console.log(
          '[网易云] 歌手搜索失败:',
          e
        );

        return emptyResult();
      }
    }

    /*
     * 专辑搜索
     */
    if (type === 'album') {
      try {
        var albumResponse =
          await axios.get(
            API + '/search',
            {
              params: {
                keywords: query,
                limit: 20,
                offset: (page - 1) * 20,
                type: 10,
              },
              timeout: 20000,
            }
          );

        var albumResult =
          albumResponse.data;

        var albums =
          albumResult &&
          albumResult.result &&
          albumResult.result.albums;

        if (!Array.isArray(albums)) {
          return emptyResult();
        }

        return {
          isEnd: albums.length < 20,

          data: albums.map(
            function (item) {
              return {
                id: String(item.id),
                platform: PLATFORM,
                title: item.name || '',
                artist:
                  item.artist &&
                  item.artist.name
                    ? item.artist.name
                    : '',
                artwork:
                  item.picUrl || '',
                worksNum:
                  item.size || 0,
              };
            }
          ),
        };
      } catch (e) {
        console.log(
          '[网易云] 专辑搜索失败:',
          e
        );

        return emptyResult();
      }
    }

    /*
     * 歌词搜索
     *
     * 网易云歌词搜索结果结构比较复杂，
     * 这里先通过歌曲搜索得到歌曲。
     */
    if (type === 'lyric') {
      try {
        var lyricResponse =
          await axios.get(
            API + '/search',
            {
              params: {
                keywords: query,
                limit: 20,
                offset: (page - 1) * 20,
                type: 1006,
              },
              timeout: 20000,
            }
          );

        var lyricResult =
          lyricResponse.data;

        var lyricSongs =
          lyricResult &&
          lyricResult.result &&
          lyricResult.result.songs;

        if (!Array.isArray(lyricSongs)) {
          return emptyResult();
        }

        var lyricData =
          lyricSongs
            .map(convertSong)
            .filter(Boolean);

        return {
          isEnd:
            lyricData.length < 20,
          data: lyricData,
        };
      } catch (e) {
        console.log(
          '[网易云] 歌词搜索失败:',
          e
        );

        return emptyResult();
      }
    }

    return emptyResult();
  },

  /*
   * 获取歌曲播放地址
   */
  async getMediaSource(
    musicItem,
    quality
  ) {
    var id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      var level = 'standard';

      if (quality === 'high') {
        level = 'higher';
      }

      if (quality === 'super') {
        level = 'jyeffect';
      }

      var response =
        await axios.get(
          API + '/song/url/v1',
          {
            params: {
              id: id,
              level: level,
            },
            timeout: 20000,
          }
        );

      var result = response.data;

      if (
        !result ||
        !Array.isArray(result.data) ||
        !result.data.length
      ) {
        return null;
      }

      var item = result.data[0];

      if (!item || !item.url) {
        return null;
      }

      return {
        url: item.url,
      };
    } catch (e) {
      console.log(
        '[网易云] 获取播放地址失败:',
        e
      );

      return null;
    }
  },

  /*
   * 获取歌曲详情
   */
  async getMusicInfo(
    musicItem
  ) {
    var id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      var response =
        await axios.get(
          API + '/song/detail',
          {
            params: {
              ids: id,
            },
            timeout: 20000,
          }
        );

      var songs =
        response.data &&
        response.data.songs;

      if (
        !Array.isArray(songs) ||
        !songs.length
      ) {
        return null;
      }

      var song =
        convertSong(songs[0]);

      return song || null;
    } catch (e) {
      console.log(
        '[网易云] 获取歌曲详情失败:',
        e
      );

      return null;
    }
  },

  /*
   * 获取歌词
   */
  async getLyric(
    musicItem
  ) {
    var id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      var response =
        await axios.get(
          API + '/lyric',
          {
            params: {
              id: id,
            },
            timeout: 20000,
          }
        );

      var result =
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
            : undefined,
      };
    } catch (e) {
      console.log(
        '[网易云] 获取歌词失败:',
        e
      );

      return null;
    }
  },

  /*
   * 获取歌单详情
   */
  async getMusicSheetInfo(
    sheetItem,
    page
  ) {
    var id = sheetItem.id;

    if (!id) {
      return {
        isEnd: true,
        musicList: [],
      };
    }

    page = page || 1;

    try {
      var response =
        await axios.get(
          API + '/playlist/detail',
          {
            params: {
              id: id,
            },
            timeout: 20000,
          }
        );

      var playlist =
        response.data &&
        response.data.playlist;

      if (!playlist) {
        return {
          isEnd: true,
          musicList: [],
        };
      }

      var tracks =
        Array.isArray(playlist.tracks)
          ? playlist.tracks
          : [];

      var musicList =
        tracks
          .map(convertSong)
          .filter(Boolean);

      return {
        isEnd: true,

        musicList: musicList,

        sheetItem: {
          title:
            playlist.name || '',
          artist:
            playlist.creator &&
            playlist.creator.nickname
              ? playlist.creator.nickname
              : '',
          artwork:
            playlist.coverImgUrl ||
            '',
          description:
            playlist.description ||
            '',
        },
      };
    } catch (e) {
      console.log(
        '[网易云] 获取歌单失败:',
        e
      );

      return {
        isEnd: true,
        musicList: [],
      };
    }
  },

  /*
   * 网易云歌单链接导入
   */
  async importMusicSheet(
    urlLike
  ) {
    if (!urlLike) {
      return null;
    }

    var text = String(urlLike);

    var match =
      text.match(
        /[?&]id=(\d+)/
      );

    if (!match) {
      match =
        text.match(
          /playlist[\/#](\d+)/
        );
    }

    if (!match) {
      throw new Error(
        '无法识别网易云歌单链接'
      );
    }

    return {
      id: match[1],
      platform: PLATFORM,
      title: '网易云歌单',
    };
  },
};