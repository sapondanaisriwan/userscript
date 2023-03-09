// ==UserScript==
// @name         Youtube Thumbnail
// @namespace    Youtube.com
// @version      1.0.0.0
// @description  Adds a clickable thumbnail that opens in a new tab in the highest possible resolution.
// @author       Puzzle
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @connect      i.ytimg.com
// ==/UserScript==

/* jshint esversion: 11 */

(function() {
    'use strict';

    const prefix = 'userscript--youtube-thumbnail--';

    async function filterBiggestThumbnail(videoID) {
        return new Promise( async (resolve, reject) => {
            const resolutions = [
                { name: "maxres", filename: "maxresdefault.jpg", width: 1280, },
                { name: "standard", filename: "sddefault.jpg", width: 640, },
                { name: "high", filename:"hqdefault.jpg", width: 480, },
                { name: "medium", filename: "mqdefault.jpg", width: 320, },
                { name: "default", filename: "default.jpg", width: 120, }
            ];

            for (const resolution of resolutions) {
                const response = await new Promise( (resolve,reject) => {
                    GM_xmlhttpRequest({
                        method: 'get',
                        url: `https://i.ytimg.com/vi/${videoID}/${resolution.filename}`,
                        onload: function(response) {
                            resolve(response);
                        }
                    });
                })
                if (response.status === 200) return resolve(resolution.filename);
            }
        })

    }

    async function waitUntilExist(selector) {
        return new Promise((res, rej) => {
            let timer = setInterval(function (e) {
                const el = document.querySelector(selector);
                if (el) {
                  clearInterval(timer);
                  res(el);
                }
            }, 100);
        });
    }

    function createStyle(parent) {
        parent.insertAdjacentHTML('afterBegin',`
        <style id=${prefix}style>

        </style>`.trim());
    }


    async function createImage(parent) {
        let videoID = new URLSearchParams(location.search).get('v') || location.pathname.match(/\/shorts\/([\w-_]+)/i)[1];

        let container = document.getElementById(`${prefix}container`);
        let thumbnail = container?.shadowRoot?.querySelector('#thumbnail');

        if (container && thumbnail) {
            if (thumbnail.dataset.videoId === videoID) return;
            thumbnail.classList.remove('loaded');
        } else {
            container = document.createElement('div');
            container.id = `${prefix}container`;

            thumbnail = document.createElement('div');
            thumbnail.id = `thumbnail`;
            thumbnail.onclick = function() { window.open(thumbnail.dataset.thumbnailUrl); };

            const shadowRoot = container.attachShadow({mode: 'open'});
            shadowRoot.innerHTML = `
            <style>
                /* userscript thumbnail */
                #thumbnail { height: 90px; width: 160px; border-radius: 2px; opacity: 0; margin-bottom: 20px; background-size: cover; background-repeat:no-repeat; background-position: center; background-color: black; box-shadow: 2px 2px 5px 0px black; cursor: pointer; }
                #thumbnail.loaded { opacity: 1; }
            </style>`;
            shadowRoot.append(thumbnail);

            parent.insertAdjacentElement('afterBegin', container);
        }

        thumbnail.dataset.videoId = videoID;

        const filename = await filterBiggestThumbnail(videoID);
        const thumbWithMaxWidthURL = `https://i.ytimg.com/vi/${videoID}/${filename}`;
        thumbnail.style.backgroundImage = `url("${thumbWithMaxWidthURL}")`;
        thumbnail.dataset.thumbnailUrl = thumbWithMaxWidthURL;
        thumbnail.classList.add('loaded');

    }

    createStyle(document.documentElement);

    document.addEventListener('yt-navigate-finish', async function(e) {
        if (location.pathname === '/watch') {
            const parent = await waitUntilExist('ytd-structured-description-content-renderer.ytd-video-secondary-info-renderer');
            createImage(parent);
        }
    });
})();