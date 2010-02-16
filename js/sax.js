/*
 
Recursive SAX-emulating parser.

Traverses the DOM tree, triggering SAX events as it goes. Pretty minimal
implementation thus far, ignoring all sorts of details but generally relying
on the document to be already parsed and nodes fully formed (with
attributes, etc) by the DOM parser.

This is fully continuation-based, so the parser "pauses" until the
continuation callback is called by the handler.

Create a new parser like so:

   var parser = new Sax.Parser(parentElement, eventHandler);

and start parsing:

   parser.parse();

Events that are sent to the handler:

  start()  - called at the start of the document (no continuation, synchronous).
  finish() - called at the end of the document (no continuation, synchronous).

  startElement(element continuation) - called when a new element is encountered.
  endElement(element, continuation)  - called when an element is closed.

  textNode(textElement, continuation) - called when a text element is encountered.
                                        no endTextNode callback exists, since text
                                        nodes are self-contained.
*/

var Sax = new function () {

  this.Parser = function (node, handler) {

    var descend = function (node, continuation) {
      switch (node.nodeType) {
        case 1:

          var childNodes = node.childNodes;
          var childNodesLength = childNodes.length;

          function buildContinuation(i, nextContinuation) {
            if (i < childNodesLength) {
              // We have more children to traverse.
              descend(childNodes[i], function () { buildContinuation(i+1, nextContinuation); });
            } else {
              // No more children to traverse; continue on.
              handler.endElement(node, function () { nextContinuation(); });
            }
          }

          handler.startElement(node, function () { buildContinuation(0, continuation); });

          break;

        case 3:
          handler.textNode(node, function () { continuation(); });
          break;

        default:
          continuation();
          break;
      }
    };

    this.parse = function () {
      handler.start();
      descend(node, function () {
        handler.finish();
      });
    };
  }
}();
