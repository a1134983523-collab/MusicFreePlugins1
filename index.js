"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

const axios_1 = require("axios");
const cheerio_1 = require("cheerio");
const CryptoJS = require("crypto-js");
const dayjs = require("dayjs");

const pageSize = 20;

const headers = {
    "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
};


/* =========================================================
 * Audiomack 原代码
 * ========================================================= */

function nonce(e = 10) {
    let n =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        r = "";

    for (let i = 0; i < e; i++)
        r += n.charAt(
            Math.floor(
                Math.random() * n.length
            )
        );

    return r;
}

function getNormalizedParams(parameters) {
    const sortedKeys = [];
    const normalizedParameters = [];

    for (let e in parameters) {
        sortedKeys.push(_encode(e));
    }

    sortedKeys.sort();

    for (
        let idx = 0;
        idx < sortedKeys.length;
        idx++
    ) {
        const e = sortedKeys[idx];

        var n,
            r,
            i = _decode(e),
            a = parameters[i];

        for (
            a.sort(),
            n = 0;
            n < a.length;
            n++
        )
            (r = _encode(a[n])),
                normalizedParameters.push(
                    e + "=" + r
                );
    }

    return normalizedParameters.join("&");
}

function _encode(e) {
    return e
        ? encodeURIComponent(e)
            .replace(/[!'()]/g, escape)
            .replace(/\*/g, "%2A")
        : "";
}

function _decode(e) {
    return e ? decodeURIComponent(e) : "";
}

function u(e) {
    (this._parameters = {}),
        this._loadParameters(e || {});
}

u.prototype = {
    _loadParameters: function (e) {
        e instanceof Array
            ? this._loadParametersFromArray(e)
            : "object" == typeof e &&
              this._loadParametersFromObject(e);
    },

    _loadParametersFromArray: function (e) {
        var n;

        for (
            n = 0;
            n < e.length;
            n++
        )
            this._loadParametersFromObject(
                e[n]
            );
    },

    _loadParametersFromObject: function (e) {
        var n;

        for (n in e)
            if (e.hasOwnProperty(n)) {
                var r =
                    this._getStringFromParameter(
                        e[n]
                    );

                this._loadParameterValue(
                    n,
                    r
                );
            }
    },

    _loadParameterValue: function (e, n) {
        var r;

        if (n instanceof Array) {

            for (
                r = 0;
                r < n.length;
                r++
            ) {

                var i =
                    this._getStringFromParameter(
                        n[r]
                    );

                this._addParameter(
                    e,
                    i
                );
            }

            0 == n.length &&
                this._addParameter(
                    e,
                    ""
                );

        } else {

            this._addParameter(
                e,
                n
            );
        }
    },

    _getStringFromParameter: function (e) {

        var n = e || "";

        try {

            (
                "number" ==
                    typeof e ||
                "boolean" ==
                    typeof e
            ) &&
                (n = e.toString());

        } catch (e) {}

        return n;
    },

    _addParameter: function (e, n) {

        this._parameters[e] ||
            (this._parameters[e] = []);

        this._parameters[e].push(n);
    },

    get: function () {
        return this._parameters;
    },
};

function getSignature(
    method,
    urlPath,
    params,
    secret =
        "f3ac5b086f3eab260520d8e3049561e6"
) {

    urlPath =
        urlPath.split("?")[0];

    urlPath =
        urlPath.startsWith("http")
            ? urlPath
            : "https://api.audiomack.com/v1" +
              urlPath;

    const r =
        new u(params).get();

    const httpMethod =
        method.toUpperCase();

    const normdParams =
        getNormalizedParams(r);

    const l =
        _encode(httpMethod) +
        "&" +
        _encode(urlPath) +
        "&" +
        _encode(normdParams);

    const hash =
        CryptoJS.HmacSHA1(
            l,
            secret + "&"
        ).toString(
            CryptoJS.enc.Base64
        );

    return hash;
}

function formatMusicItem(raw) {

    return {
        id: raw.id,
        artwork:
            raw.image ||
            raw.image_base,
        duration: +raw.duration,
        title: raw.title,
        artist: raw.artist,
        album: raw.album,
        url_slug: raw.url_slug,
    };
}

function formatAlbumItem(raw) {

    var _a, _b;

    return {
        artist: raw.artist,

        artwork:
            raw.image ||
            raw.image_base,

        id: raw.id,

        date:
            dayjs
                .unix(+raw.released)
                .format("YYYY-MM-DD"),

        title: raw.title,

        _musicList:
            (_b =
                (_a =
                    raw === null ||
                    raw === void 0
                        ? void 0
                        : raw.tracks) ===
                    null ||
                _a === void 0
                    ? void 0
                    : _a.map) ===
                null ||
            _b === void 0
                ? void 0
                : _b.call(
                      _a,
                      (it) => ({
                          id:
                              it.song_id ||
                              it.id,

                          artwork:
                              raw.image ||
                              raw.image_base,

                          duration:
                              +it.duration,

                          title:
                              it.title,

                          artist:
                              it.artist,

                          album:
                              raw.title,
                      })
                  ),
    };
}

function formatMusicSheetItem(raw) {

    var _a,
        _b,
        _c,
        _d,
        _e,
        _f;

    return {

        worksNum:
            raw.track_count,

        id:
            raw.id,

        title:
            raw.title,

        artist:
            (_a =
                raw.artist) ===
                null ||
            _a === void 0
                ? void 0
                : _a.name,

        artwork:
            raw.image ||
            raw.image_base,

        artistItem: {

            id:
                (_b =
                    raw.artist) ===
                    null ||
                _b === void 0
                    ? void 0
                    : _b.id,

            avatar:
                ((_c =
                    raw.artist) ===
                    null ||
                _c === void 0
                    ? void 0
                    : _c.image) ||
                ((_d =
                    raw.artist) ===
                    null ||
                _d === void 0
                    ? void 0
                    : _d.image_base),

            name:
                (_e =
                    raw.artist) ===
                    null ||
                _e === void 0
                    ? void 0
                    : _e.name,

            url_slug:
                (_f =
                    raw.artist) ===
                    null ||
                _f === void 0
                    ? void 0
                    : _f.url_slug,
        },

        createAt:
            dayjs
                .unix(+raw.created)
                .format("YYYY-MM-DD"),

        url_slug:
            raw.url_slug,
    };
}

async function searchBase(
    query,
    page,
    show
) {

    const params = {

        limit:
            pageSize,

        oauth_consumer_key:
            "audiomack-js",

        oauth_nonce:
            nonce(32),

        oauth_signature_method:
            "HMAC-SHA1",

        oauth_timestamp:
            Math.round(
                Date.now() / 1e3
            ),

        oauth_version:
            "1.0",

        page:
            page,

        q:
            query,

        show:
            show,

        sort:
            "popular",
    };

    const oauth_signature =
        getSignature(
            "GET",
            "/search",
            params
        );

    const results =
        (
            await axios_1.default.get(
                "https://api.audiomack.com/v1/search",
                {
                    headers,
                    params:
                        Object.assign(
                            Object.assign(
                                {},
                                params
                            ),
                            {
                                oauth_signature,
                            }
                        ),
                }
            )
        ).data.results;

    return results;
}

async function searchMusic(
    query,
    page
) {

    const results =
        await searchBase(
            query,
            page,
            "songs"
        );

    return {
        isEnd:
            results.length <
            pageSize,

        data:
            results.map(
                formatMusicItem
            ),
    };
}

async function searchAlbum(
    query,
    page
) {

    const results =
        await searchBase(
            query,
            page,
            "albums"
        );

    return {
        isEnd:
            results.length <
            pageSize,

        data:
            results.map(
                formatAlbumItem
            ),
    };
}

async function searchMusicSheet(
    query,
    page
) {

    const results =
        await searchBase(
            query,
            page,
            "playlists"
        );

    return {
        isEnd:
            results.length <
            pageSize,

        data:
            results.map(
                formatMusicSheetItem
            ),
    };
}

async function searchArtist(
    query,
    page
) {

    const results =
        await searchBase(
            query,
            page,
            "artists"
        );

    return {
        isEnd:
            results.length <
            pageSize,

        data:
            results.map(
                (raw) => ({
                    name:
                        raw.name,

                    id:
                        raw.id,

                    avatar:
                        raw.image ||
                        raw.image_base,

                    url_slug:
                        raw.url_slug,
                })
            ),
    };
}

let dataUrlBase;

async function getDataUrlBase() {

    if (dataUrlBase) {
        return dataUrlBase;
    }

    const rawHtml =
        (
            await axios_1.default.get(
                "https://audiomack.com/"
            )
        ).data;

    const $ =
        (0, cheerio_1.load)(
            rawHtml
        );

    const script =
        $(
            "script#__NEXT_DATA__"
        ).text();

    const jsonObj =
        JSON.parse(script);

    if (jsonObj.buildId) {

        dataUrlBase =
            `https://audiomack.com/_next/data/${jsonObj.buildId}`;
    }

    return dataUrlBase;
}

async function getArtistWorks(
    artistItem,
    page,
    type
) {

    if (type === "music") {

        const params = {

            artist_id:
                artistItem.id,

            limit:
                pageSize,

            oauth_consumer_key:
                "audiomack-js",

            oauth_nonce:
                nonce(32),

            oauth_signature_method:
                "HMAC-SHA1",

            oauth_timestamp:
                Math.round(
                    Date.now() / 1e3
                ),

            oauth_version:
                "1.0",

            page:
                page,

            sort:
                "rank",

            type:
                "songs",
        };

        const oauth_signature =
            getSignature(
                "GET",
                "/search_artist_content",
                params
            );

        const results =
            (
                await axios_1.default.get(
                    "https://api.audiomack.com/v1/search_artist_content",
                    {
                        headers,

                        params:
                            Object.assign(
                                Object.assign(
                                    {},
                                    params
                                ),
                                {
                                    oauth_signature,
                                }
                            ),
                    }
                )
            ).data.results;

        return {

            isEnd:
                results.length <
                pageSize,

            data:
                results.map(
                    formatMusicItem
                ),
        };

    } else if (
        type === "album"
    ) {

        const params = {

            artist_id:
                artistItem.id,

            limit:
                pageSize,

            oauth_consumer_key:
                "audiomack-js",

            oauth_nonce:
                nonce(32),

            oauth_signature_method:
                "HMAC-SHA1",

            oauth_timestamp:
                Math.round(
                    Date.now() / 1e3
                ),

            oauth_version:
                "1.0",

            page:
                page,

            sort:
                "rank",

            type:
                "albums",
        };

        const oauth_signature =
            getSignature(
                "GET",
                "/search_artist_content",
                params
            );

        const results =
            (
                await axios_1.default.get(
                    "https://api.audiomack.com/v1/search_artist_content",
                    {
                        headers,

                        params:
                            Object.assign(
                                Object.assign(
                                    {},
                                    params
                                ),
                                {
                                    oauth_signature,
                                }
                            ),
                    }
                )
            ).data.results;

        return {

            isEnd:
                results.length <
                pageSize,

            data:
                results.map(
                    formatAlbumItem
                ),
        };
    }
}

async function getMusicSheetInfo(
    sheet,
    page
) {

    const _dataUrlBase =
        await getDataUrlBase();

    const res =
        (
            await axios_1.default.get(
                `${_dataUrlBase}/${sheet.artistItem.url_slug}/playlist/${sheet.url_slug}.json`,
                {
                    params: {

                        page_slug:
                            sheet.artistItem.url_slug,

                        playlist_slug:
                            sheet.url_slug,
                    },

                    headers:
                        Object.assign(
                            {},
                            headers
                        ),
                }
            )
        ).data;

    const musicPage =
        res.pageProps
            .initialState
            .musicPage;

    const targetKey =
        Object.keys(
            musicPage
        ).find(
            (it) =>
                it.startsWith(
                    "musicMusicPage"
                )
        );

    const tracks =
        musicPage[targetKey]
            .results
            .tracks;

    return {

        isEnd:
            true,

        musicList:
            tracks.map(
                formatMusicItem
            ),
    };
}

async function getMediaSource(
    musicItem,
    quality
) {

    if (
        quality !==
        "standard"
    ) {
        return;
    }

    const params = {

        environment:
            "desktop-web",

        hq:
            true,

        oauth_consumer_key:
            "audiomack-js",

        oauth_nonce:
            nonce(32),

        oauth_signature_method:
            "HMAC-SHA1",

        oauth_timestamp:
            Math.round(
                Date.now() / 1e3
            ),

        oauth_version:
            "1.0",

        section:
            "/search",
    };

    const oauth_signature =
        getSignature(
            "GET",
            `/music/play/${musicItem.id}`,
            params
        );

    const res =
        (
            await axios_1.default.get(
                `https://api.audiomack.com/v1/music/play/${musicItem.id}`,
                {
                    headers:
                        Object.assign(
                            Object.assign(
                                {},
                                headers
                            ),
                            {
                                origin:
                                    "https://audiomack.com",
                            }
                        ),

                    params:
                        Object.assign(
                            Object.assign(
                                {},
                                params
                            ),
                            {
                                oauth_signature,
                            }
                        ),
                }
            )
        ).data;

    return {
        url:
            res.signedUrl,
    };
}

async function getAlbumInfo(
    albumItem
) {

    return {
        musicList:
            albumItem._musicList.map(
                (it) =>
                    Object.assign(
                        {},
                        it
                    )
            ),
    };
}

async function getRecommendSheetTags() {

    const rawHtml =
        (
            await axios_1.default.get(
                "https://audiomack.com/playlists"
            )
        ).data;

    const $ =
        (0, cheerio_1.load)(
            rawHtml
        );

    const script =
        $(
            "script#__NEXT_DATA__"
        ).text();

    const jsonObj =
        JSON.parse(script);

    return {

        data: [
            {
                data:
                    jsonObj.props
                        .pageProps
                        .categories,
            },
        ],
    };
}

async function getRecommendSheetsByTag(
    tag,
    page
) {

    if (!tag.id) {

        tag = {
            id: "34",
            title:
                "What's New",
            url_slug:
                "whats-new",
        };
    }

    const params = {

        featured:
            "yes",

        limit:
            pageSize,

        oauth_consumer_key:
            "audiomack-js",

        oauth_nonce:
            nonce(32),

        oauth_signature_method:
            "HMAC-SHA1",

        oauth_timestamp:
            Math.round(
                Date.now() / 1e3
            ),

        oauth_version:
            "1.0",

        page:
            page,

        slug:
            tag.url_slug,
    };

    const oauth_signature =
        getSignature(
            "GET",
            "/playlist/categories",
            params
        );

    const results =
        (
            await axios_1.default.get(
                "https://api.audiomack.com/v1/playlist/categories",
                {
                    headers,

                    params:
                        Object.assign(
                            Object.assign(
                                {},
                                params
                            ),
                            {
                                oauth_signature,
                            }
                        ),
                }
            )
        ).data.results
            .playlists;

    return {

        isEnd:
            results.length <
            pageSize,

        data:
            results.map(
                formatMusicSheetItem
            ),
    };
}

async function getTopLists() {

    const genres = [

        {
            title:
                "All Genres",
            url_slug:
                null,
        },

        {
            title:
                "Afrosounds",
            url_slug:
                "afrobeats",
        },

        {
            title:
                "Hip-Hop/Rap",
            url_slug:
                "rap",
        },

        {
            title:
                "Latin",
            url_slug:
                "latin",
        },

        {
            title:
                "Caribbean",
            url_slug:
                "caribbean",
        },

        {
            title:
                "Pop",
            url_slug:
                "pop",
        },

        {
            title:
                "R&B",
            url_slug:
                "rb",
        },

        {
            title:
                "Gospel",
            url_slug:
                "gospel",
        },

        {
            title:
                "Electronic",
            url_slug:
                "electronic",
        },

        {
            title:
                "Rock",
            url_slug:
                "rock",
        },

        {
            title:
                "Punjabi",
            url_slug:
                "punjabi",
        },

        {
            title:
                "Country",
            url_slug:
                "country",
        },

        {
            title:
                "Instrumental",
            url_slug:
                "instrumental",
        },

        {
            title:
                "Podcast",
            url_slug:
                "podcast",
        },
    ];

    return [

        {
            title:
                "Trending Songs",

            data:
                genres.map(
                    (it) => {

                        var _a;

                        return Object.assign(
                            Object.assign(
                                {},
                                it
                            ),
                            {
                                type:
                                    "trending",

                                id:
                                    (_a =
                                        it.url_slug) !==
                                        null &&
                                    _a !==
                                        void 0
                                        ? _a
                                        : it.title,
                            }
                        );
                    }
                ),
        },

        {
            title:
                "Recently Added Music",

            data:
                genres.map(
                    (it) => {

                        var _a;

                        return Object.assign(
                            Object.assign(
                                {},
                                it
                            ),
                            {
                                type:
                                    "recent",

                                id:
                                    (_a =
                                        it.url_slug) !==
                                        null &&
                                    _a !==
                                        void 0
                                        ? _a
                                        : it.title,
                            }
                        );
                    }
                ),
        },
    ];
}

async function getTopListDetail(
    topListItem,
    page = 1
) {

    const type =
        topListItem.type;

    const partialUrl =
        `/music/${topListItem.url_slug ? `${topListItem.url_slug}/` : ""}${type}/page/${page}`;

    const url =
        `https://api.audiomack.com/v1${partialUrl}`;

    const params = {

        oauth_consumer_key:
            "audiomack-js",

        oauth_nonce:
            nonce(32),

        oauth_signature_method:
            "HMAC-SHA1",

        oauth_timestamp:
            Math.round(
                Date.now() / 1e3
            ),

        oauth_version:
            "1.0",

        type:
            "song",
    };

    const oauth_signature =
        getSignature(
            "GET",
            partialUrl,
            params
        );

    const results =
        (
            await axios_1.default.get(
                url,
                {
                    headers,

                    params:
                        Object.assign(
                            Object.assign(
                                {},
                                params
                            ),
                            {
                                oauth_signature,
                            }
                        ),
                }
            )
        ).data.results;

    return {
        musicList:
            results.map(
                formatMusicItem
            ),
    };
}


/* =========================================================
 * 新增：外部歌单导入
 *
 * 保留上面的 Audiomack 原功能不变
 * ========================================================= */


/* ---------- 通用 ---------- */

function normalizeText(value) {

    return String(value || "")
        .toLowerCase()
        .replace(
            /[\u3000\s]+/g,
            ""
        )
        .replace(
            /[《》「」『』【】（）()[\]{}<>]/g,
            ""
        )
        .replace(
            /[·•・,，.。!！?？:：;；/\\|_-]/g,
            ""
        );
}


/* ---------- 平台识别 ---------- */

function detectImportPlatform(
    url
) {

    const value =
        String(url || "")
            .toLowerCase();

    if (
        value.includes(
            "music.163.com"
        ) ||
        value.includes(
            "163cn.tv"
        )
    ) {
        return "netease";
    }

    if (
        value.includes(
            "y.qq.com"
        ) ||
        value.includes(
            "i.y.qq.com"
        ) ||
        value.includes(
            "qq.com"
        )
    ) {
        return "qq";
    }

    return null;
}


/* ---------- 网易云 ID ---------- */

function getNeteasePlaylistId(
    url
) {

    const value =
        String(url || "");

    let match =
        value.match(
            /[?&]id=(\d+)/i
        );

    if (match) {
        return match[1];
    }

    match =
        value.match(
            /playlist[\/_-](\d+)/i
        );

    if (match) {
        return match[1];
    }

    match =
        value.match(
            /playlist.*?id=(\d+)/i
        );

    if (match) {
        return match[1];
    }

    return null;
}


/* ---------- QQ ID ---------- */

function getQQPlaylistId(
    url
) {

    const value =
        String(url || "");

    let match =
        value.match(
            /\/playlist\/(\d+)/i
        );

    if (match) {
        return match[1];
    }

    match =
        value.match(
            /[?&]id=(\d+)/i
        );

    if (match) {
        return match[1];
    }

    match =
        value.match(
            /[?&]disstid=(\d+)/i
        );

    if (match) {
        return match[1];
    }

    match =
        value.match(
            /detail\/(\d+)/i
        );

    if (match) {
        return match[1];
    }

    return null;
}


/* =========================================================
 * 网易云歌单
 * ========================================================= */

async function importNeteasePlaylist(
    url
) {

    const playlistId =
        getNeteasePlaylistId(
            url
        );

    if (!playlistId) {
        throw new Error(
            "无法识别网易云歌单ID"
        );
    }

    const response =
        await axios_1.default.get(
            "https://music.163.com/api/playlist/detail",
            {
                params: {
                    id:
                        playlistId
                },

                headers: {
                    "User-Agent":
                        headers[
                            "user-agent"
                        ],

                    Referer:
                        "https://music.163.com/"
                },

                timeout:
                    12000
            }
        );

    const body =
        response.data;

    if (
        !body ||
        !body.result
    ) {
        throw new Error(
            "网易云歌单读取失败"
        );
    }

    const tracks =
        Array.isArray(
            body.result.tracks
        )
            ? body.result.tracks
            : [];

    const result =
        tracks
            .map(
                function (track) {

                    if (
                        !track ||
                        track.id ==
                            null
                    ) {
                        return null;
                    }

                    const artists =
                        Array.isArray(
                            track.ar
                        )
                            ? track.ar
                                  .map(
                                      function (
                                          artist
                                      ) {
                                          return artist &&
                                              artist.name
                                              ? artist.name
                                              : "";
                                      }
                                  )
                                  .filter(
                                      Boolean
                                  )
                                  .join(
                                      " / "
                                  )
                            : "";

                    return {

                        id:
                            String(
                                track.id
                            ),

                        title:
                            track.name ||
                            "",

                        artist:
                            artists,

                        album:
                            track.al &&
                            track.al.name
                                ? track.al.name
                                : "",

                        artwork:
                            track.al &&
                            track.al.picUrl
                                ? track.al.picUrl
                                : "",

                        duration:
                            track.dt
                                ? Math.floor(
                                      track.dt /
                                          1000
                                  )
                                : undefined,

                        platform:
                            "网易云音乐"
                    };
                }
            )
            .filter(
                Boolean
            );

    return result;
}


/* =========================================================
 * QQ歌单
 * ========================================================= */

async function importQQPlaylist(
    url
) {

    const playlistId =
        getQQPlaylistId(
            url
        );

    if (!playlistId) {
        throw new Error(
            "无法识别QQ音乐歌单ID"
        );
    }

    /*
     * QQ公开接口。
     *
     * 先尝试移动/网页歌单接口。
     */
    let data = null;

    try {

        const response =
            await axios_1.default.get(
                "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg",
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
                            "json",

                        g_tk:
                            5381
                    },

                    headers: {

                        Referer:
                            "https://y.qq.com/",

                        "User-Agent":
                            headers[
                                "user-agent"
                            ]
                    },

                    timeout:
                        12000,

                    responseType:
                        "text"
                }
            );

        data =
            response.data;

    } catch (error) {

        console.log(
            "[QQ歌单] API读取失败"
        );
    }

    if (
        typeof data ===
        "string"
    ) {

        data =
            data
                .replace(
                    /^MusicJsonCallback\(/,
                    ""
                )
                .replace(
                    /\);?\s*$/,
                    ""
                );

        try {

            data =
                JSON.parse(
                    data
                );

        } catch (error) {

            data =
                null;
        }
    }

    let playlist = null;

    if (
        data &&
        Array.isArray(
            data.cdlist
        ) &&
        data.cdlist.length
    ) {

        playlist =
            data.cdlist[0];
    }

    /*
     * 某些情况下接口结构不同，
     * 再尝试 QQ 歌单页面。
     */
    if (!playlist) {

        try {

            const page =
                await axios_1.default.get(
                    `https://y.qq.com/n/ryqq/playlist/${playlistId}`,
                    {
                        headers,

                        timeout:
                            12000
                    }
                );

            const html =
                page.data;

            const $ =
                (0, cheerio_1.load)(
                    html
                );

            const script =
                $(
                    "script#__NEXT_DATA__"
                ).text();

            if (script) {

                const json =
                    JSON.parse(
                        script
                    );

                playlist =
                    findQQPlaylistData(
                        json
                    );
            }

        } catch (error) {

            console.log(
                "[QQ歌单] 页面读取失败"
            );
        }
    }

    if (!playlist) {

        throw new Error(
            "QQ音乐歌单无法公开读取"
        );
    }

    const songlist =
        Array.isArray(
            playlist.songlist
        )
            ? playlist.songlist
            : [];

    /*
     * 这里不把QQ ID直接当网易云ID。
     *
     * 后面会自动搜索网易云匹配。
     */
    const songs =
        songlist
            .map(
                function (song) {

                    const singers =
                        Array.isArray(
                            song.singer
                        )
                            ? song.singer
                                  .map(
                                      function (
                                          singer
                                      ) {
                                          return singer &&
                                              singer.name
                                              ? singer.name
                                              : "";
                                      }
                                  )
                                  .filter(
                                      Boolean
                                  )
                                  .join(
                                      " / "
                                  )
                            : "";

                    return {

                        title:
                            song.songname ||
                            song.name ||
                            "",

                        artist:
                            singers,

                        album:
                            song.album &&
                            song.album.name
                                ? song.album.name
                                : "",

                        qqMid:
                            song.mid ||
                            "",

                        artwork:
                            song.album &&
                            song.album.mid
                                ? "https://y.gtimg.cn/music/photo_new/T002R300x300M000" +
                                  song.album.mid +
                                  ".jpg"
                                : ""
                    };
                }
            )
            .filter(
                function (song) {
                    return (
                        song.title &&
                        song.artist
                    );
                }
            );

    /*
     * 自动匹配网易云。
     */
    const matched =
        await matchQQToNetease(
            songs
        );

    return matched;
}


/* =========================================================
 * 从QQ网页JSON中寻找歌单
 * ========================================================= */

function findQQPlaylistData(
    obj
) {

    if (!obj) {
        return null;
    }

    if (
        typeof obj !==
        "object"
    ) {
        return null;
    }

    if (
        Array.isArray(
            obj.songlist
        )
    ) {

        return obj;
    }

    if (
        obj.cdlist &&
        Array.isArray(
            obj.cdlist
        ) &&
        obj.cdlist.length
    ) {

        return obj.cdlist[0];
    }

    for (
        const key in obj
    ) {

        try {

            const result =
                findQQPlaylistData(
                    obj[key]
                );

            if (result) {
                return result;
            }

        } catch (error) {}
    }

    return null;
}


/* =========================================================
 * 网易云搜索
 * ========================================================= */

async function searchNeteaseForImport(
    title,
    artist
) {

    const keyword =
        String(title || "") +
        " " +
        String(artist || "");

    try {

        const response =
            await axios_1.default.get(
                "https://music.163.com/api/search/get/web",
                {

                    params: {

                        s:
                            keyword,

                        type:
                            1,

                        offset:
                            0,

                        total:
                            "true",

                        limit:
                            20
                    },

                    headers: {

                        "User-Agent":
                            headers[
                                "user-agent"
                            ],

                        Referer:
                            "https://music.163.com/"
                    },

                    timeout:
                        8000
                }
            );

        const body =
            response.data;

        if (
            !body ||
            !body.result ||
            !Array.isArray(
                body.result.songs
            )
        ) {
            return null;
        }

        const songs =
            body.result.songs;

        const wantedTitle =
            normalizeText(
                title
            );

        const wantedArtist =
            normalizeText(
                artist
            );

        let best =
            null;

        let bestScore =
            -1;

        songs.forEach(
            function (song) {

                const songTitle =
                    normalizeText(
                        song.name
                    );

                const songArtist =
                    normalizeText(
                        Array.isArray(
                            song.ar
                        )
                            ? song.ar
                                  .map(
                                      function (
                                          artist
                                      ) {
                                          return artist &&
                                              artist.name
                                              ? artist.name
                                              : "";
                                      }
                                  )
                                  .filter(
                                      Boolean
                                  )
                                  .join(
                                      ""
                                  )
                            : ""
                    );

                let score = 0;

                /*
                 * 歌名完全相同
                 */
                if (
                    songTitle ===
                    wantedTitle
                ) {

                    score +=
                        10000;

                } else if (
                    songTitle.includes(
                        wantedTitle
                    )
                ) {

                    score +=
                        5000;

                } else {

                    return;
                }

                /*
                 * 歌手完全相同
                 */
                if (
                    songArtist ===
                    wantedArtist
                ) {

                    score +=
                        12000;

                } else if (
                    songArtist.includes(
                        wantedArtist
                    ) ||
                    wantedArtist.includes(
                        songArtist
                    )
                ) {

                    score +=
                        6000;
                }

                /*
                 * 排除明显特殊版本。
                 */
                const version =
                    normalizeText(
                        (
                            song.name ||
                            ""
                        ) +
                        " " +
                        (
                            song.al &&
                            song.al.name
                                ? song.al.name
                                : ""
                        )
                    );

                if (
                    version.includes(
                        "live"
                    ) ||
                    version.includes(
                        "现场"
                    ) ||
                    version.includes(
                        "remix"
                    ) ||
                    version.includes(
                        "dj"
                    ) ||
                    version.includes(
                        "伴奏"
                    ) ||
                    version.includes(
                        "翻唱"
                    )
                ) {

                    score -=
                        4000;
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
            }
        );

        /*
         * 必须至少歌名完全匹配。
         *
         * 防止错误导入。
         */
        if (
            !best ||
            bestScore <
                10000
        ) {
            return null;
        }

        const artists =
            Array.isArray(
                best.ar
            )
                ? best.ar
                      .map(
                          function (
                              artist
                          ) {
                              return artist &&
                                  artist.name
                                  ? artist.name
                                  : "";
                          }
                      )
                      .filter(
                          Boolean
                      )
                      .join(
                          " / "
                      )
                : "";

        return {

            id:
                String(
                    best.id
                ),

            title:
                best.name ||
                title,

            artist:
                artists ||
                artist,

            album:
                best.al &&
                best.al.name
                    ? best.al.name
                    : "",

            artwork:
                best.al &&
                best.al.picUrl
                    ? best.al.picUrl
                    : "",

            duration:
                best.dt
                    ? Math.floor(
                          best.dt /
                              1000
                      )
                    : undefined,

            platform:
                "网易云音乐"
        };

    } catch (error) {

        console.log(
            "[网易云匹配失败]",
            title
        );

        return null;
    }
}


/* =========================================================
 * QQ → 网易云
 * ========================================================= */

async function matchQQToNetease(
    songs
) {

    const result = [];

    /*
     * 为避免一次性请求太多，
     * 一首一首匹配。
     */
    for (
        let i = 0;
        i < songs.length;
        i++
    ) {

        const song =
            songs[i];

        try {

            const matched =
                await searchNeteaseForImport(
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

        } catch (error) {

            console.log(
                "[QQ → 网易云] 匹配失败:",
                song.title
            );
        }

        /*
         * 小延迟。
         */
        if (
            i <
            songs.length - 1
        ) {

            await new Promise(
                function (
                    resolve
                ) {
                    setTimeout(
                        resolve,
                        100
                    );
                }
            );
        }
    }

    return result;
}


/* =========================================================
 * 去重
 * ========================================================= */

function deduplicateImportedSongs(
    songs
) {

    const map = {};
    const result = [];

    songs.forEach(
        function (song) {

            if (
                !song ||
                !song.id
            ) {
                return;
            }

            /*
             * platform + id
             */
            const key =
                String(
                    song.platform ||
                    ""
                ) +
                ":" +
                String(
                    song.id
                );

            if (
                map[key]
            ) {
                return;
            }

            map[key] =
                true;

            result.push(
                song
            );
        }
    );

    return result;
}


/* =========================================================
 * 最终插件
 * ========================================================= */

module.exports = {

    /*
     * 原 Audiomack 身份保留。
     */
    platform:
        "Audiomack",

    version:
        "0.1.0",

    author:
        "猫头猫 + a1134983523-collab",

    appVersion:
        ">=0.6.0",

    primaryKey: [
        "id",
        "url_slug"
    ],

    srcUrl:
        "https://raw.githubusercontent.com/a1134983523-collab/MusicFreePlugins1/main/index.js",

    cacheControl:
        "no-cache",

    supportedSearchType: [
        "music",
        "album",
        "sheet",
        "artist"
    ],

    /*
     * ============================================
     * 新增：歌单导入提示
     * ============================================
     */
    hints: {

        importMusicSheet:
            "粘贴网易云或QQ音乐歌单链接。网易云直接导入；QQ音乐会自动匹配到网易云歌曲。"
    },


    /*
     * ============================================
     * 原 Audiomack 搜索
     * ============================================
     */

    async search(
        query,
        page,
        type
    ) {

        if (
            type ===
            "music"
        ) {

            return await searchMusic(
                query,
                page
            );

        } else if (
            type ===
            "album"
        ) {

            return await searchAlbum(
                query,
                page
            );

        } else if (
            type ===
            "sheet"
        ) {

            return await searchMusicSheet(
                query,
                page
            );

        } else if (
            type ===
            "artist"
        ) {

            return await searchArtist(
                query,
                page
            );
        }
    },


    /*
     * ============================================
     * 原 Audiomack 播放
     * ============================================
     */

    getMediaSource,


    /*
     * 原 Audiomack 专辑
     */

    getAlbumInfo,


    /*
     * 原 Audiomack 歌单
     */

    getMusicSheetInfo,


    /*
     * 原 Audiomack 作者作品
     */

    getArtistWorks,


    /*
     * 原 Audiomack 推荐
     */

    getRecommendSheetTags,

    getRecommendSheetsByTag,

    getTopLists,

    getTopListDetail,


    /*
     * ============================================
     * 新增：外部歌单导入
     * ============================================
     */

    async importMusicSheet(
        urlLike
    ) {

        const url =
            String(
                urlLike ||
                ""
            ).trim();

        if (!url) {

            throw new Error(
                "请输入歌单链接"
            );
        }

        /*
         * 自动识别平台
         */
        const platform =
            detectImportPlatform(
                url
            );


        /*
         * 网易云
         */
        if (
            platform ===
            "netease"
        ) {

            const songs =
                await importNeteasePlaylist(
                    url
                );

            return deduplicateImportedSongs(
                songs
            );
        }


        /*
         * QQ音乐
         */
        if (
            platform ===
            "qq"
        ) {

            const songs =
                await importQQPlaylist(
                    url
                );

            return deduplicateImportedSongs(
                songs
            );
        }


        /*
         * 未知平台
         */
        throw new Error(
            "暂不支持此歌单链接，请粘贴网易云或QQ音乐歌单链接。"
        );
    }
};