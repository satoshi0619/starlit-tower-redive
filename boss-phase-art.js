(function (root) {
  'use strict';

  // The view boxes share the standing portraits' proportions. Artwork can
  // extend past the image edges while its anchors stay attached to the pose.
  const profiles = Object.freeze({
    christina: Object.freeze({
      width: 136.05,
      behind: `
        <defs>
          <linearGradient id="phase-christina-blade" x2="0" y2="1">
            <stop stop-color="#fff5c4"/>
            <stop offset=".43" stop-color="#eeaa58"/>
            <stop offset=".63" stop-color="#9a3c4f"/>
            <stop offset="1" stop-color="#3a1a38"/>
          </linearGradient>
          <linearGradient id="phase-christina-cloth" x2=".7" y2="1">
            <stop stop-color="#341e40"/>
            <stop offset=".48" stop-color="#8a2e48"/>
            <stop offset="1" stop-color="#d74956"/>
          </linearGradient>
          <g id="phase-christina-wing">
            <path d="M62 89Q35 85 8 60L-23 29l8 48-20-9 21 53 13-4 16 30 15-5 18 12 23-29Z"
              fill="url(#phase-christina-cloth)" stroke="#e7a764" stroke-width="1.5"/>
            <path d="M63 96 40 97-11 36-19 6 2 19 54 72Z
                     M49 117 25 115-16 75-28 48-4 56 40 96Z
                     M37 135 16 132-13 109-22 87-1 93 28 117Z"
              fill="url(#phase-christina-blade)" stroke="#ffd990" stroke-width="1.45" stroke-linejoin="round"/>
            <path d="M-19 6 52 85 63 96M-28 48l66 59 11 10M-22 87l48 39 11 9"
              fill="none" stroke="#fff0bd" stroke-width="1.4"/>
            <path d="m18 57 4-4 10 11-4 4Zm-8 26 4-4 11 10-4 4Z" fill="#ac294d"/>
            <path d="M42 121Q20 165-10 202l13-35-16 9 28-53Z"
              fill="url(#phase-christina-cloth)" stroke="#bd694f" stroke-width="1.3"/>
          </g>
        </defs>
        <ellipse cx="68" cy="304" rx="88" ry="12" fill="#bb5560" fill-opacity=".18" stroke="#ffc673" stroke-opacity=".58"/>
        <ellipse cx="68" cy="304" rx="78" ry="8" fill="none" stroke="#ffcf79" stroke-opacity=".52" stroke-dasharray="5 8"/>
        <g class="boss-form-float">
          <g class="boss-form-wing wing-left"><use href="#phase-christina-wing"/></g>
          <g class="boss-form-wing wing-right"><use href="#phase-christina-wing" transform="translate(142 4) scale(-1 1)"/></g>
          <path d="m-17 126 3 7-3 7-3-7Zm180 5 3 7-3 7-3-7ZM11 20l2 5-2 5-2-5Zm125 3 2 5-2 5-2-5Z"
            fill="#ffe6a2"/>
        </g>`,
      front: `
        <path d="M95 72q13-9 27-7l11 7-9 2 3 6-10 1 4 6-18 3-7 9-3-13Z"
          fill="#6a2a48" stroke="#efb667" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="m97 75 23-8 10 5-15 2-15 9Zm0 13 20-7-6 5-10 5Z" fill="#f6cb84"/>
        <path d="M47 78q-8-7-20-5l-6 7 7 2-2 6 13 3 5 6 4-9Z"
          fill="#733348" stroke="#ecb365" stroke-width="1.45" stroke-linejoin="round"/>
        <path d="m26 79 6-4 13 6-2 5Z" fill="#ffe1a2"/>
        <path d="m91 94 5-8 5 8-5 8Z" fill="#ffd58c" stroke="#6f2d4c" stroke-width="1.3"/>`
    }),
    ranpha: Object.freeze({
      width: 188.35,
      behind: `
        <defs>
          <linearGradient id="phase-ranpha-petal" x2=".7" y2="1">
            <stop stop-color="#ffe0f7"/>
            <stop offset=".3" stop-color="#c995f8"/>
            <stop offset=".7" stop-color="#7052b3"/>
            <stop offset="1" stop-color="#36264f"/>
          </linearGradient>
          <linearGradient id="phase-ranpha-skirt" x2=".6" y2="1">
            <stop stop-color="#2e2756"/>
            <stop offset=".63" stop-color="#684c9e"/>
            <stop offset="1" stop-color="#b974d5"/>
          </linearGradient>
          <g id="phase-ranpha-wing">
            <path d="M93 130C68 120 30 131 2 160-17 179-21 212-42 234-3 232 28 215 44 195 54 236 9 254-2 275 39 266 65 246 77 222L104 149Z"
              fill="url(#phase-ranpha-skirt)" stroke="#bd92e2" stroke-width="1.5"/>
            <path d="M93 129C58 123 33 118 11 96-7 77 0 53-28 35-14 33 0 37 8 44 26 61 41 45 54 67 67 84 67 108 93 129Z
                     M94 140C62 150 22 140 4 125-13 110-14 96-32 91-9 81 0 86 16 93 30 98 41 91 55 105Z
                     M90 150C68 180 36 194 11 187-7 182-18 173-34 175-22 155-3 146 11 147 26 148 40 151 51 143Z"
              fill="url(#phase-ranpha-petal)" stroke="#efc7f3" stroke-width="1.5"/>
            <path d="M-24 39C5 60 15 103 78 124M-28 94C2 96 25 133 78 137M-30 173C4 167 31 182 73 158
                     M-31 228Q23 211 59 172M3 270q43-22 57-56"
              fill="none" stroke="#fff0ff" stroke-opacity=".68" stroke-width="1.35"/>
          </g>
        </defs>
        <ellipse cx="96" cy="303" rx="113" ry="12" fill="#7d42b6" fill-opacity=".22" stroke="#d0a5ff" stroke-opacity=".64"/>
        <path d="M44 100a60 60 0 1 1 105 0M51 95a52 52 0 1 1 90 0" fill="none" stroke="#e8b8fe" stroke-width="1.4" stroke-opacity=".77"/>
        <path d="m97 5 4 7-4 7-4-7Zm-41 19 4 6-4 6-4-6Zm84 0 4 6-4 6-4-6Z" fill="#f7d2ff"/>
        <g class="boss-form-float">
          <use href="#phase-ranpha-wing"/>
          <use href="#phase-ranpha-wing" transform="translate(197 -3) scale(-1 1)"/>
          <path d="M-19 115q-12-2-13-14 14 4 13 14Zm233 23q10-6 14-17-14 2-14 17ZM2 61q-7-8-2-15 6 7 2 15Zm205 5q7-8 2-15-6 7-2 15Z"
            fill="#f2c6fe"/>
        </g>`,
      front: `
        <path d="M76 76q-19 8-24 29c10-5 15-10 22-11-7 12-8 24-4 35 12-14 16-31 10-49Z
                 M120 77q22 8 29 28c-12-4-18-9-26-10 9 13 10 26 5 38-12-14-17-32-13-50Z"
          fill="#875db7" stroke="#f6cefb" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M74 81q-14 12-16 16 8-3 15-6Zm1 14q-5 12-3 25 7-13 6-24Zm48-13q15 8 20 17-13-5-19-8Zm1 14q7 12 6 29-8-14-9-26Z" fill="#ecc8fa"/>
        <path d="m107 127 3 5-3 5-3-5Z" fill="#f7dcff" stroke="#6e4a92" stroke-width="1.2"/>`
    }),
    fubuki: Object.freeze({
      width: 1301 / 1674 * 320,
      behind: `
        <ellipse cx="125" cy="302" rx="134" ry="13" fill="#28577e" fill-opacity=".25" stroke="#7ce7f7" stroke-opacity=".72"/>
        <path class="boss-form-float" d="M10 242l26-36m-18 18-18 5m201 27 29-40m-20 26 33-7m-137 50 13-9m80-119 32-24M19 127l22-17"
          fill="none" stroke="#b1f5ff" stroke-width="2.2" stroke-linecap="round"/>`,
      front: `
        <g transform="translate(25 75) rotate(-21)">
          <ellipse rx="27" ry="19" fill="none" stroke="#a3f1fa" stroke-width="2.6"/>
          <ellipse rx="21" ry="15" fill="none" stroke="#fff0d2" stroke-width="1.8" stroke-dasharray="4 4"/>
          <g class="boss-phase-weapon-pulse">
            <path d="M0-15 6-5 19 0 5 4 0 16-5 5-24 0-5-4Z" fill="#ffdfb1"/>
            <path d="M-14-10-30-16m15 22-19 6m-13-13-13-3" fill="none" stroke="#e4fbff" stroke-width="2.4" stroke-linecap="round"/>
          </g>
        </g>`
    }),
    misora: Object.freeze({
      width: 1303 / 1883 * 320,
      behind: `
        <ellipse cx="109" cy="303" rx="114" ry="13" fill="#9d477f" fill-opacity=".22" stroke="#fa9ddd" stroke-opacity=".68"/>
        <g class="boss-form-float" fill="none" stroke="#e9a7f2" stroke-width="1.9">
          <path d="M29 232H15v14m51-14h14v14m-65 25v14h14m51-14v14H66"/>
          <path d="M213 191h-14v14m40-14h14v14m-54 16v14h14m40-14v14h-14"/>
          <path d="M181 122h-8v8m27-8h8v8m-35 19v8h8m27-8v8h-8"/>
        </g>`,
      front: `
        <g transform="translate(194 72) rotate(-25)">
          <g class="boss-phase-weapon-pulse" fill="none">
            <ellipse rx="23" ry="29" stroke="#fac7f3" stroke-width="1.8"/>
            <ellipse rx="29" ry="36" stroke="#7ce0ff" stroke-width="1.8" stroke-dasharray="9 6 2 8"/>
            <path d="M-32 0h12m40 0h12M0-38v12m0 52v12" stroke="#ffe0f5" stroke-width="2.4"/>
          </g>
        </g>`
    }),
    kaiser: Object.freeze({
      width: 202.35,
      behind: `
        <defs>
          <linearGradient id="phase-kaiser-cloak" x2=".8" y2="1">
            <stop stop-color="#562243"/>
            <stop offset=".52" stop-color="#241832"/>
            <stop offset="1" stop-color="#692944"/>
          </linearGradient>
          <linearGradient id="phase-kaiser-crown" x2="0" y2="1">
            <stop stop-color="#ffd7a7"/>
            <stop offset=".31" stop-color="#d67162"/>
            <stop offset=".7" stop-color="#72284b"/>
            <stop offset="1" stop-color="#29172d"/>
          </linearGradient>
          <g id="phase-kaiser-cape">
            <path d="M106 66 72 56 28 38-10 16l9 29-23-9 24 42-18-5 18 27-25 43 23-8-24 46 31-12-24 70 24-8-10 66 30-21 20-50 12 42 37-117Z"
              fill="url(#phase-kaiser-cloak)" stroke="#d37d79" stroke-width="1.85" stroke-linejoin="round"/>
            <path d="M94 77 43 65-8 25l19 39-19-8 30 39-10 27 19-13-10 44 27-23-25 84 29-29-9 51 29-46 25-69Z"
              fill="#6d2948" stroke="#d68879" stroke-opacity=".67" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M-8 25Q24 75 76 92M-8 57q29 40 66 50M-20 176l52-56m-51 115 58-71m-47 124 53-82"
              fill="none" stroke="#e78c89" stroke-opacity=".57" stroke-width="1.4"/>
          </g>
        </defs>
        <ellipse cx="108" cy="305" rx="127" ry="12" fill="#95284b" fill-opacity=".22" stroke="#e78a87" stroke-opacity=".65"/>
        <g class="boss-form-float">
          <use href="#phase-kaiser-cape"/>
          <use href="#phase-kaiser-cape" transform="translate(218 0) scale(-1 1)"/>
          <circle cx="109" cy="59" r="55" fill="#251425" stroke="#dc666f" stroke-width="3"/>
          <path d="M60 49a50 50 0 0 1 98 0M55 61a54 54 0 0 0 108 0" fill="none" stroke="#ffbc93" stroke-width="1.5"/>
          <path d="m72 63-8-36 19 11 3-28 15 19 10-26 11 26 14-19 3 29 19-12-9 36-39 12Z"
            fill="url(#phase-kaiser-crown)" stroke="#ffc799" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="m71 31 11 21 7-32 10 28 12-38 11 38 11-28 8 32 11-21M78 62l32 9 33-9"
            fill="none" stroke="#ffe3ab" stroke-width="1.35"/>
          <path d="m-24 105 3 10-3 9-3-9Zm265 7 3 10-3 9-3-9Z" fill="#ffb293"/>
        </g>`,
      front: `
        <path d="M70 83 47 85 30 97l-10 26 20-12 10-2 8-12 15-4Zm73-4 21 5 21 17 8 22-21-11-11-3-6-13-13-5Z"
          fill="#421e37" stroke="#ed947d" stroke-width="1.65" stroke-linejoin="round"/>
        <path d="m26 114 11-15 30-12-15 9-9 11Zm158 1-11-15-26-15 13 10 9 10Z" fill="#e19b84"/>
        <path d="M37 163 13 184-2 224l20-17 17-10 16-32-10 5Zm133-7 23 18 18 36-22-13-16-7-19-28 12 4Z"
          fill="#54223e" stroke="#ea8a79" stroke-width="1.55" stroke-linejoin="round"/>
        <path d="m5 216 30-26 9-16-16 12Zm198-13-30-22-10-13 17 9Z" fill="#f5a683"/>`
    })
  });

  function render(bossId) {
    const id = bossId === 'kaiser_insight' ? 'kaiser' : bossId;
    const profile = Object.hasOwn(profiles, id) ? profiles[id] : null;
    if (!profile) return { behind: '', front: '' };
    const layer = (placement, paths) => `<svg class="boss-form-layer boss-form-${placement}" viewBox="0 0 ${profile.width} 320" style="--boss-form-ratio:${profile.width / 320}" aria-hidden="true" focusable="false">${paths}</svg>`;
    return {
      behind: layer('behind', profile.behind),
      front: layer('front', profile.front)
    };
  }

  const api = Object.freeze({ profiles, render });
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TowerBossPhaseArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
