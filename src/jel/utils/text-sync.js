export default class TextSync extends EventTarget {
  constructor(component) {
    super();
    this.component = component;
  }
}
