import plugin from '../plugin.json';
import style from './style.scss';

const acorn = require('acorn');
const walk = require('acorn-walk');

const sidebarApps = acode.require('sidebarApps');

const { editor } = editorManager;

class FunctionLocator {

  async init() {
    try {
      acode.addIcon('detect-icon', this.baseUrl + 'assets/icon.png');

      this.setupGlobalStyle();
      this.setupFunctionLocatorContainer();
      this.setupEventListeners();

    } catch (error) {}
  }

  /**
   * Global Style
   */
  setupGlobalStyle() {
    this.$style = tag('style', { textContent: style, id: 'function-locator' });
    document.head.append(this.$style);
  }

  /**
   * Setup sidebar function locator
   */
  setupFunctionLocatorContainer() {
    this.$funcLocatorContainer = tag('div', { className: 'container sidebar-func-locator' });

    const $header = <div className='header'>
      <span className='title'>Function Locator</span>
    </div>

    this.$locatorArea = tag('div', { className: 'container locator-area' });

    this.$funcLocatorContainer.append($header, this.$locatorArea);

    sidebarApps.add('detect-icon', 'detect-sidebar-app', 'Detect', (app) => {
      app.append(this.$funcLocatorContainer);
    });
  }

  /**
   * List scroll
   * @returns
   */
  collapsableList() {
    const $ul = tag('ul', {
      className: 'scroll',
    });

    const $mainWrapper = tag('div', {
      className: 'list collapsible',
      children: [$ul],
    });

    [$mainWrapper].forEach(defineProperties);

    return $mainWrapper;

    function defineProperties($el) {
      Object.defineProperties($el, {
        $ul: {
          get() {
            return $ul;
          }
        }
      })
    }
  }

  /**
   * Setup event listener
   */
  setupEventListeners() {
    editor.on('changeSession', this.detectClassesAndFunctions.bind(this));
    editor.on('blur', this.detectClassesAndFunctions.bind(this));
  }

  /**
   * Detect classes and fnctions Javascript
   * @returns 
   */
  async detectClassesAndFunctions() {
    try {
      const editorContent = editor.getValue();
      const result = this.parseEditorContent(editorContent);
      if (result.length == 0) {
        this.$locatorArea.innerHTML = '';
        return;
      }
      this.displayClassesAndFunctions(result);
    } catch (error) {
      this.$locatorArea.innerHTML = '';
    }
  }

  /**
   * Parse editor content
   * @param {string} editorContent 
   * @returns 
   */
  parseEditorContent(editorContent) {
    const result = [];

    const ast = acorn.parse(editorContent, { ecmaVersion: 'latest' });

    walk.simple(ast, {
      ClassDeclaration: (node) => this.handleClassDeclaration(node, result),
      FunctionDeclaration: (node) => this.handleFunctionDeclaration(node, result),
      VariableDeclaration: (node) => this.handleVariableDeclaration(node, result)
    });

    return result;
  }

  handleClassDeclaration(node, result) {
    const className = node.id.name;
    const methods = [];

    walk.simple(node, {
      FunctionDeclaration: (innerNode) => methods.push(innerNode.id.name),
      MethodDefinition: (innerNode) => methods.push(innerNode.key.name)
    });

    result.push({ name: className, type: 'class', methods });
  }

  handleFunctionDeclaration(node, result) {
    result.push({ name: node.id.name, type: 'func' });
  }

  handleVariableDeclaration(node, result) {
    if (node.declarations.length === 1 && node.declarations[0].init && node.declarations[0].init.type === 'ArrowFunctionExpression') {
      result.push({ name: node.declarations[0].id.name, type: 'func' });
    }
    this.displayClassesAndFunctions
  }

  /**
   * Fungsi untuk menampilkan daftar di sidebar
   * @param { object } [items]
   */
  displayClassesAndFunctions(items) {
    this.$locatorArea.innerHTML = '';

    const $itemList = this.collapsableList();

    items.forEach(item => {
      if (item.type == 'class') {
        const methods = this.createMethodList(item);
        const tile = this.createClassTile(item, methods);

        $itemList.$ul.append(tile, methods);
      } else {
        const functions = this.createFunctionList(item);
        $itemList.$ul.append(functions);
      }
    });

    this.$locatorArea.append($itemList);
    this.createClassTile
  }

  /**
   * 
   * @param {object} [item]
   * @param {HTMLElement} m
   * @returns 
   */
  createClassTile(item, m) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.innerHTML = this.getExpandTileContent(item);

    tile.onclick = () => { this.toggleMethodList(tile, item, m) }
    
    return tile;
  }

  createMethodList(item) {
    const methodList = document.createElement('div');
    methodList.className = 'methods';

    const methodElements = item.methods.map(m => `<div class="method" data-name="${m}" data-cn="${item.name}"><span class="type-func">func</span><span class="text"><code>${m}</code></span></div>`);
    methodList.innerHTML = methodElements.join(' ');

    const methods = methodList.querySelectorAll('.method');
    methods.forEach(method => {
      method.onclick = () => {
        const targetRow = this.findRowOfFunction('class', method.dataset.name, method.dataset.cn);
        if (targetRow != null) editor.gotoLine(targetRow + 1, 0, true);
      }
    });

    return methodList;
  }

  /**
   * 
   * @param {HTMLElement} tile 
   * @param {object} item 
   * @param {HTMLElement} m 
   */
  toggleMethodList(tile, item, m) {
    m.classList.toggle('hidden');
    const isClick = m.classList.contains('hidden');
    tile.innerHTML = isClick ? this.getTileContent(item) : this.getExpandTileContent(item);
  }

  createFunctionList(item) {
    const functionList = document.createElement('div');
    functionList.className = 'function';

    functionList.innerHTML = `<span class="type-${item.type}"><code>${item.type}</code></span> <span class="text"><code>${item.name}</code></span>`;

    functionList.onclick = () => {
      const targetRow = this.findRowOfFunction('func', item.name, null);
      if (targetRow != null) editor.gotoLine(targetRow + 1, 0, true);
    }

    return functionList;
  }

  getTileContent(item) {
    return `<span><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></span> <span class="type-class">${item.type}</span><span class="text">${item.name}</span>`;
  }
 
  getExpandTileContent(item) {
    return `<span><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg></span> <span class="type-class">${item.type}</span><span class="text">${item.name}</span>`;
  }

  /**
   * Fungsi untuk mencari index Class dan Fungsi
   * @param {string} type 
   * @param {string} funcName 
   * @param {string} className 
   * @returns
   */
  findRowOfFunction(type, funcName, className) {
    const editorContent = editor.getValue().split('\n');
    const strContent = editor.getValue()

    if (type == 'class') {
      const regex = new RegExp(`class\\s+${className}\\s*{[\\s\\S]*?${funcName}\\s*\\(`);
      const match = strContent.match(regex);

      if (match) {
        const classIndex = strContent.indexOf(match[0]);
        const methodIndex = strContent.indexOf(`${funcName}(`, classIndex);

        if (methodIndex !== -1) {
          const lines = strContent.substr(0, methodIndex).split('\n');
          return lines.length - 1;
        }
      }
    } else {
      for (let i = 0; i < editorContent.length; i++) {
        if (editorContent[i].includes(funcName)) {
          return i;
        }
      }
    }

    return null;
  }

  async destroy() {
    this.$funcLocatorContainer.remove();
  }
}

if (window.acode) {
  const acodePlugin = new FunctionLocator();
  acode.setPluginInit(plugin.id, async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    acodePlugin.baseUrl = baseUrl;
    await acodePlugin.init($page, cacheFile, cacheFileUrl);
  });
  acode.setPluginUnmount(plugin.id, () => {
    acodePlugin.destroy();
  });
}