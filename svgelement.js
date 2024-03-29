"use strict";
class Elem {
    constructor(svg, tag, parent = svg) {
        this.elem = document.createElementNS(svg.namespaceURI, tag);
        parent.appendChild(this.elem);
    }
    attr(name, value) {
        if (typeof value === 'undefined') {
            return this.elem.getAttribute(name);
        }
        this.elem.setAttribute(name, value.toString());
        return this;
    }
    observe(event) {
        return Observable.fromEvent(this.elem, event);
    }
    append(child) {
        this.elem.appendChild(child);
    }
}
//# sourceMappingURL=svgelement.js.map