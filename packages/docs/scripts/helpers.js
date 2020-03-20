var join = require('path').join;

hexo.extend.helper.register('show_lang', function (lang) {
  if (this.page.lang != 'en') {
    return '/' + this.page.lang;
  }
});

hexo.extend.helper.register('lang_name', function(lang) {
  var data = this.site.data.languages[lang];
  return data.name || data;
});

hexo.extend.helper.register('sidebar', function (path) {
  return `
    <ul class="c-side-navigation js-docs-sidebar">
      <li class="c-side-navigation__header">
        <a href="#" class="c-side-navigation__header__offset js-docs-trigger-close">
          <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg"> <rect x="1.5752" y="0.368273" width="22" height="1" rx="0.5" transform="rotate(45 1.5752 0.368273)" fill="#090909"></rect> <rect x="0.868164" y="15.9246" width="22" height="1" rx="0.5" transform="rotate(-45 0.868164 15.9246)" fill="#090909"></rect> </svg>
        </a>
      </li>
      ${genSidebarList.call(this, "", this.site.data.sidebar[path])}
    </ul>
  `
});

function genSidebarList(parent, entries) {
  /* necessary due to changed context of map() */
  let self = this
  /* all languages except english needs a path prefix */
  let lang = (self.page.lang != 'en' && parent == "") ? self.page.lang : ''
  return entries.map(entry => {
    /* normally path needs to be prefixed with lang and parent path */

    let fullPath;
    if (entry.path.startsWith('#')) {
      fullPath = join('', lang, parent) + entry.path;
    } else if (entry.path.startsWith('empty')) {
      fullPath = 'empty';
    } else {
      fullPath = join('', lang, entry.path);
    }
    /* sometimes paths are full URLs instead of sub-paths */
    if (entry.path.startsWith('http')) {
      fullPath = entry.path
    }
    /* path is active when it's the one we are on currently */
    let isActive = (self.path).startsWith(fullPath)
    return `
      <li class="c-side-navigation__item ${isActive ? "is-active" : ""}">
        ${(fullPath == 'empty') ? `
          <span class="c-side-navigation__item__anchor">${entry.title}</span>
         ` : `<a href="${fullPath}" class="c-side-navigation__item__anchor">${entry.title}</a>`
         }
        ${(entry.children != undefined) ? `
        <ul class="c-side-navigation__item__tree">
          ${genSidebarList.call(self, fullPath, entry.children)}
        </ul>
        ` : ''}
      </li>`
  }).join('\n')
}
