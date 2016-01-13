class WindowInfo {
  constructor() {
    this.props = [];

  }
  propList() {
    for (var prop in window) {
      this.props.push(prop);
    }
  }

  list() {
    log(this.props.join(', '));
  }
}

(new WindowInfo()).list();
