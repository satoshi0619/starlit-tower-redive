(function (root, factory) {
  'use strict';
  const art = factory();
  if (typeof module === 'object' && module.exports) module.exports = art;
  if (root) root.TowerRosterArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Keep the original SVG crop and its source pixels. Blank only the image
  // outside the crop and its sampling margin to reduce the embedded PNG size.
  const heroes = [
    'pecorine', 'rei', 'kokkoro', 'kyaru', 'hatsune', 'yui', 'jun', 'nozomi', 'shizuru',
    'makoto', 'suzuna', 'arisa', 'miyako', 'anna', 'yori', 'kaori', 'saren', 'monika'
  ];
  return Object.fromEntries(heroes.map(id => [id, { icon: `assets/roster/${id}-icon.svg` }]));
});
