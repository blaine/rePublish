var Sax = new function () {

  this.Parser = function (node, handler) {

    var descend = function (node) {

      // We only handle element nodes and text nodes. Everything else we just
      // ignore, since (except for maybe CDATA, but that can be added as text
      // if the need arises.
      switch (node.nodeType) {

        case 1: // Element Node

          handler.startElement(node);

          var ll = node.childNodes.length;
          var i = 0;
          while (ll--) {
            descend(node.childNodes[i++], handler);
          }

          handler.endElement(node);

          break;

        case 3: // Text Node

          handler.textNode(node);
          break;

      }
    }

    this.parse = function () {
      handler.start();
      descend(node);
      handler.finish();
    }
  }
}();
