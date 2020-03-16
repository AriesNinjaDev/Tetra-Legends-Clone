import {loadMenu} from '../loaders.js';
import $, {negativeMod} from '../shortcuts.js';
import gameHandler from '../game/game-handler.js';
import settings from '../settings.js';
import input from '../input.js';
const isSelectable = (type) => {
  if (
    type == null ||
    type == 'control' ||
    type == 'setting' ||
    type == 'slider'
  ) {
    return true;
  }
  return false;
};
const getKey = (event) => {
  if (event.code === 'Backspace') {
    return;
  }
  settings.addControl(menu.waitingKey, event.code);
  menu.isLocked = false;
  $('#key-popup').classList.add('hidden');
  document.removeEventListener('keydown', getKey);
};
class Menu {
  constructor() {
    this.current = {
      name: null,
      data: null,
      properties: null,
    };
    this.isEnabled = false;
    this.isLocked = false;
  }
  get selected() {
    return parseInt($('#menu > div.selected').id.substring(7));
  }
  get selectedData() {
    return this.current.data[this.selected];
  }
  get length() {
    return $('#menu > div').length;
  }
  get selectedControl() {
    return ($('#menu > .control.selected > .control-bay > .set-control.selected'));
  }
  load(name, type = 'default') {
    this.isLocked = true;
    this.hideMenu();
    loadMenu(name)
        .then((menu) => {
          this.clear();
          this.current.name = name;
          this.current.data = menu.data;
          this.current.properties = menu.properties;
          if (this.current.properties.parent != null) {
            const back = {
              'label': 'Back',
              'description': 'Go back to the previous menu',
              'action': 'back',
            };
            this.current.data.unshift(back);
          }
          switch (type) {
            case 'controls':
              this.drawControls();
              break;
            default:
              this.draw();
              break;
          }
          this.showMenu();
          this.isLocked = false;
          this.isEnabled = true;
        })
        .catch((error) => {
        // TODO error handling
        });
  }
  close() {
    this.isLocked = true;
    this.isEnabled = false;
    this.hide();
  }
  open() {
    this.isLocked = false;
    this.isEnabled = true;
    this.show();
  }
  show() {
    $('#menu-container').classList.remove('hidden');
  }
  hide() {
    $('#menu-container').classList.add('hidden');
  }
  showMenu() {
    $('#vertical-menu').classList.remove('hidden');
  }
  hideMenu() {
    $('#vertical-menu').classList.add('hidden');
  }
  clear() {
    while ($('#menu').firstChild) {
      $('#menu').removeChild($('#menu').firstChild);
    }
  }
  draw() {
    let nonOptions = 0;
    for (let i = 0; i < this.current.data.length; i++) {
      const currentData = this.current.data[i];
      let element = document.createElement('div');
      const sub = document.createElement('div');
      switch (currentData.type) {
        case 'overline':
          element = document.createElement('header');
          element.classList.add('overline');
          break;
        case 'social':
          element = document.createElement('a');
          element.classList.add('third-width');
          element.classList.add('social');
          break;
        case 'slider':
          element = document.createElement('div');
          element.classList.add('slider-container');
          sub.innerHTML =
            `<input type="range" min="${currentData.min}" max="${currentData.max}" value="${currentData.min}" class="slider" id="${currentData.settingType}-${currentData.setting}">`;
          break;
        case 'control':
          element = document.createElement('div');
          element.classList.add('control');
          sub.classList.add('control-bay');
          sub.id = `control-${currentData.control}`;
          sub.innerHTML =
`<div class='set-control'>ArrowUp ✕ </div><div class='set-control'>ArrowUp ✕ </div><div class='set-control'>+</div>`;
          break;
        default:
          element = document.createElement('div');
          element.classList.add('btn');
          switch (currentData.width) {
            case 'half':
              element.classList.add('half-width');
              break;
            case 'third':
              element.classList.add('third-width');
              break;
            default:
              element.classList.add('full-width');
              break;
          }
          break;
      }
      if (isSelectable(currentData.type)) {
        const index = i - nonOptions;
        element.id = `option-${index}`;
        element.onmouseenter = () => {
          if (this.isLocked || input.mouseLimit < 1) {
            return;
          }
          this.select(index, true);
        };
        element.onclick = () => {
          this.ok();
        };
      } else {
        nonOptions++;
      }
      if (currentData.type === 'control') {
        const label = document.createElement('div');
        label.textContent = currentData.label;
        label.classList.add('label');
        element.appendChild(label);
        element.appendChild(sub);
      } else if (currentData.type === 'slider') {
        const label = document.createElement('div');
        label.textContent = currentData.label;
        label.classList.add('label');
        element.appendChild(label);
        element.appendChild(sub);
      } else {
        element.textContent = currentData.label;
      }
      if (currentData.disabled) {
        element.classList.add('disabled');
      }
      if (currentData.default) {
        element.classList.add('selected');
        $('#description').textContent = currentData.description;
      }
      $('#menu').appendChild(element);
    }
    const newData = [];
    for (const data of this.current.data) {
      if (isSelectable(data.type)) {
        newData.push(data);
      }
    }
    this.current.data = [...newData];
    if (this.current.name === 'controls') {
      this.drawControls();
    }
    return;
    for (let i = 0; i < this.current.data.length; i++) {
      const currentData = this.current.data[i];
      const element = document.createElement('li');
      element.id = `option-${i}`;
      element.textContent = currentData.label;
      element.onmouseenter = () => {
        this.select(i, true);
      };
      element.onclick = () => {
        this.ok();
      };
      if (currentData.default) {
        element.classList.add('selected');
        $('#description').textContent = currentData.description;
      }
      $('#vertical-menu').appendChild(element);
    }
    const spaceRemianing = window.innerHeight - $('#vertical-menu').getBoundingClientRect().y;
    $('#vertical-menu').style.height = `${spaceRemianing - 80}px`;
  }
  listenForNewKey() {
    this.isLocked = true;
    document.addEventListener('keydown', getKey);
  }
  drawControls() {
    const duplicates = settings.getConflictingControlNames();
    for (const key of Object.keys(settings.controls)) {
      const array = settings.controls[key];
      const currentControlElement = $(`#control-${key}`);
      currentControlElement.innerHTML = '';
      let i = 0;
      for (const item of array) {
        const element = document.createElement('div');
        element.classList.add('set-control');
        if (i === 0) {
          element.classList.add('selected');
        }
        if (duplicates.indexOf(item) !== -1) {
          element.classList.add('conflict');
        }
        element.textContent = `${item} ×`;
        element.setAttribute('parent', key);
        element.setAttribute('control', item);
        element.onclick = () => {
          settings.removeControl(element.getAttribute('parent'), element.getAttribute('control'));
          this.drawControls();
        };
        element.onmouseenter = () => {
          if (input.mouseLimit < 1) {
            return;
          }
          this.selectedControl.classList.remove('selected');
          element.classList.add('selected');
        };
        currentControlElement.appendChild(element);
        i++;
      }
      const element = document.createElement('div');
      element.classList.add('set-control');
      if (i === 0) {
        element.classList.add('selected');
      }
      element.setAttribute('parent', key);
      element.setAttribute('control', 'addNew');
      element.onclick = () => {
        this.waitingKey = element.getAttribute('parent');
        $('#key-popup').classList.remove('hidden');
        this.listenForNewKey();
      };
      element.onmouseenter = () => {
        if (input.mouseLimit < 1) {
          return;
        }
        this.selectedControl.classList.remove('selected');
        element.classList.add('selected');
      };
      element.textContent = `+`;
      currentControlElement.appendChild(element);
    }
  }
  select(number, mouseOver = false) {
    for (const element of $('#menu > div')) {
      element.classList.remove('selected');
    }
    $(`#option-${number}`).classList.add('selected');
    if (!mouseOver) {
      $(`#option-${number}`).scrollIntoView({block: 'center'});
    }
    $('#description').textContent = this.current.data[number].description;
  }
  up() {
    if (!this.isLocked) {
      let modifier = 0;
      if (
        this.selectedData.width === 'half' &&
        this.current.data[negativeMod((this.selected - 1), this.length)].width === 'half'
      ) {
        modifier = 1;
      }
      this.select(negativeMod((this.selected - 1 - modifier), this.length));
    }
  }
  down() {
    if (!this.isLocked) {
      let modifier = 0;
      if (
        this.selectedData.width === 'half' &&
        this.current.data[negativeMod((this.selected + 1), this.length)].width === 'half'
      ) {
        modifier = 1;
      }
      this.select(negativeMod((this.selected + 1 + modifier), this.length));
    }
  }
  right() {
    if (this.selectedData.type === 'control') {
      const next = this.selectedControl.nextSibling;
      this.selectedControl.classList.remove('selected');
      if (next == null) {
        $('#menu > .control.selected > .control-bay').firstChild.classList.add('selected');
        return;
      }
      next.classList.add('selected');
      return;
    }
    if (this.selectedData.type === 'slider') {
      const slider = $('#menu > .slider-container.selected .slider');
      slider.value = parseInt(slider.value) + 1;
      return;
    }
    if (!this.isLocked) {
      this.select(negativeMod((this.selected + 1), this.length));
    }
  }
  left() {
    if (this.selectedData.type === 'control') {
      const prev = this.selectedControl.previousElementSibling;
      this.selectedControl.classList.remove('selected');
      if (prev == null) {
        $('#menu > .control.selected > .control-bay').lastChild.classList.add('selected');
        return;
      }
      prev.classList.add('selected');
      return;
    }
    if (!this.isLocked) {
      this.select(negativeMod((this.selected - 1), this.length));
    }
  }

  ok() {
    if (this.selectedData.type === 'control' && input.mouseLimit > 0) {
      return;
    }
    if (this.isLocked) {
      return;
    }
    if (this.selectedData.disabled) {
      return;
    }
    switch (this.selectedData.action) {
      case 'submenu':
        this.load(this.selectedData.submenu);
        break;
      case 'back':
        this.back();
        break;
      case 'quick':
        gameHandler.newGame('marathon');
        break;
      case 'game':
        gameHandler.newGame(this.selectedData.game);
        break;
      case 'control':
        this.selectedControl.onclick();
        break;
      case 'controls':
        this.load('controls', 'controls');
        break;
      case 'functionClearControls':
        for (const key of Object.keys(settings.controls)) {
          settings.controls[key] = [];
        }
        menu.drawControls();
        settings.saveControls();
        break;
      case 'functionResetControls':
        settings.resetControls();
        menu.drawControls();
        settings.saveControls();
        break;
      default:
        // TODO wtf error
        break;
    }
  }
  back() {
    if (!this.isLocked) {
      if (this.current.properties.parent !== null) {
        this.load(this.current.properties.parent);
      }
    }
  }
}
const menu = new Menu();
export default menu;
