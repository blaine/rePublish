var Paginator = function (fromNode, toNode, styleContent) {

  var delay = 0;

  var callbacks = {};
  this.addCallback = function (cbk, cbkFunc) {
    if (callbacks[cbk]) {
      callbacks[cbk].push(cbkFunc);
    } else {
      callbacks[cbk] = [cbkFunc];
    }
  };

  var emitCallback = function (cbk, arg) {
    var cbks = callbacks[cbk];

    if (!cbks) return;

    for (var i = 0, l = cbks.length; i < l; i++) {
      cbks[i](arg);
    }

    if (cbk === 'page') {
      // Give the browser some time to react if we've encountered a new page.
      delay = 20;
    }
  }

  // We store realHeight here so that we don't have to fetch it in a loop.
  var realHeight = document.defaultView.
                   getComputedStyle(toNode, null).
                   getPropertyValue('height').
                   replace('px', '');
  var maxScrollHeight = toNode.offsetHeight - realHeight;

  var realScrollHeight = function () {
    return toNode.scrollHeight - maxScrollHeight;
  };

  var nodeHandler = new function() {
    var running = true,
        started = false,
        currentNode = toNode,
        nodeHierarchy = [];

    // This is a helper function to facilitate properly cloning nodes. If
    // the source documents are the same, we can use cloneNode, but if
    // not we need to use importNode.
    var shallowClone = function() {

      var method;

      if (fromNode.ownerDocument === toNode.ownerDocument) {
        return function (node) {
          return node.cloneNode(false);
        }
      } else {
        var targetDocument = toNode.ownerDocument;

        return function (node) {
          return targetDocument.importNode(node, false);
        }
      }

    }();

    var reset = function () {
      toNode.innerHTML = '';
      currentNode = toNode;

      for (var i = 0, l = nodeHierarchy.length; i < l; i++) {
        childNode = shallowClone(nodeHierarchy[i]);
        currentNode.appendChild(childNode);
        currentNode = childNode;
        currentNode.appendChild(document.createTextNode(""));
      }
    };

    this.start = function () {
      // Clear target node, just in case.
      reset();
      emitCallback('start');
    }

    this.finish = function () {
      emitCallback('page', toNode.cloneNode(true));
      emitCallback('finish');
      reset();
    }

    // Handle an opening element, e.g., <div>, <a>, etc.
    this.startElement = function (element, c) {

      // We don't start on the first element, since the semantic here is
      // that we copy *contained* elements, not the container.
      if (!started) {
        started = true;
        return c();
      }

      // First, clone the node to be copied, fill in data URI if necesssary,
      // and append it to our document.
      var newNode = shallowClone(element);

      if (newNode.nodeName === 'IMG' || newNode.nodeName === 'image') {
        emitCallback('image', newNode);

        newNode.style.height = '';
        newNode.style.width  = '';

        var containerWidth = document.defaultView.
                             getComputedStyle(currentNode, null).
                             getPropertyValue('width').
                             replace('px', '');

        var scale = Math.min(containerWidth / newNode.width,
                             realHeight / newNode.height);

        if (scale < 1) {
          newNode.height = newNode.height * scale;
          newNode.width  = newNode.width  * scale;
        }
      }

      currentNode.appendChild(newNode);

      // If we've exceeded our height now, it's potentially due to image(s).
      // Let's try shrinking them a little. If that doesn't work, we can
      // try moving this element to the next page.
      if (realHeight < realScrollHeight()) {
        var imgs = toNode.getElementsByTagName('IMG');

        var origSizes = [],
            l = imgs.length,
            attempts = 0;

        for (var i = 0; i < l; i++) {
          origSizes[i] = [imgs[i].height, imgs[i].width];
        }

        while (attempts++ < 3 && realHeight < realScrollHeight()) {
          for (var i = 0; i < l; i++) {
            imgs[i].height = imgs[i].height * 0.9;
            imgs[i].width = imgs[i].width * 0.9;
          }
        }

        // If it didn't work, reset the image sizes.
        if (realHeight < realScrollHeight()) {
          for (var i = 0, l = origSizes.length; i < l; i++) {
            imgs[i].height = origSizes[i][0];
            imgs[i].width  = origSizes[i][1];
          }
        }
      }

      if (newNode.nodeName === 'IMG' && realHeight < realScrollHeight()) {
        currentNode.removeChild(newNode);

        emitCallback('page', toNode.cloneNode(true));
        reset();

        currentNode.appendChild(newNode);
      }

      // Now, make this node the currentNode so we can append stuff to it,
      // and track it in the nodeHierarchy.
      currentNode = currentNode.lastChild;
      nodeHierarchy.push(currentNode);

      return c();
    }

    this.endElement = function (element, c) {
      currentNode = currentNode.parentNode;
      nodeHierarchy.pop();

      return c();
    }

    this.textNode = function (element, c) {

      var rawHyphenatedText;
      try {
        rawHyphenatedText = Hyphenator.hyphenate(decodeURIComponent(escape(element.textContent)), 'en');
      } catch (e) {
        rawHyphenatedText = Hyphenator.hyphenate(element.textContent, 'en');
      }
      var newTextNode = currentNode.ownerDocument.createTextNode(rawHyphenatedText);

      currentNode.appendChild(newTextNode);

      if (realHeight >= realScrollHeight()) {
        // We're still safe. Call the callback! Continue! Do not dawdle!
        var tmpDelay = delay;
        delay = 0;
        setTimeout(function continueFast () { c(); }, tmpDelay);
        return;
      }
      // That didn't work. Try the slow approach.

      currentNode.removeChild(newTextNode);

      // Add a text node to the end of currentNode if there isn't already one there.
      if (!currentNode.lastChild || currentNode.lastChild.nodeType != 3) {
        currentNode.appendChild(currentNode.ownerDocument.createTextNode(""));
      }

      var textNode = currentNode.lastChild,
          space = '';

      var incomingText;
      try {
        incomingText = Hyphenator.hyphenate(decodeURIComponent(escape(element.textContent)), 'en');
      } catch (e) {
        incomingText = Hyphenator.hyphenate(element.textContent, 'en');
      }

      var l = incomingText.length;

      var fitText = function (start, sliceLength) {

        if (start === l) {
          var tmpDelay = delay;
          delay = 0;

          setTimeout(function continueSlow () { c(); }, tmpDelay);
          return;
        }


        if (sliceLength <= 0) {
	  // If we're here, it means we don't have any more text in the current
	  // set of chunks that will fit on the page. Trigger a new page!

          emitCallback('page', toNode.cloneNode(true));

          incomingText = incomingText.substr(start, l - start);
          l = incomingText.length;

          // reset our destination collector to the current hierarchy.
          reset();

          // Now that we've reset the currentNode (which is prepped with
          // a blank text node, we need to point our text node at that.
          textNode = currentNode.lastChild;

          // finally, start the process again.
          return fitText(start, l);
        }

        // Copy a slice of text into the text node. Hopefully it fits.
        var testText = ((start == 0) ? '' : ' ') + incomingText.substr(start, sliceLength);

        textNode.textContent += testText;

        if (realHeight < realScrollHeight()) {
          // Reset the text and try again with a more conservative sliceLength.
          textNode.textContent = textNode.textContent.substr(0, sliceLength + ((start == 0) ? 0 : 1));
          fitText(start, incomingText.lastIndexOf(' ', Math.floor(sliceLength / 2)));
        } else {
	  // We only get here by overrunning our bbox, so keep looking for the
	  // floor.
          fitText(sliceLength, incomingText.lastIndexOf(' ', Math.floor(sliceLength / 2)));
        }
      }

//      return fitText(0, l);

      var textChunks;
      try {
        textChunks = Hyphenator.hyphenate(decodeURIComponent(escape(element.textContent)), 'en').split(/[\r\n ]/);
      } catch (e) {
        textChunks = element.textContent.split(/[\r\n ]/);
      }

      var l = textChunks.length;
      while (l--) {
        // Copy this chunk into it, and see if we've overrun our bbox.
        var nextChunk = textChunks.shift();
        textNode.textContent += space + nextChunk;
        space = ' ';

        if (realHeight < realScrollHeight()) {
          // Okay, we've over-stepped our boundaries, pull off that last
          // text chunk and trigger the new page callback.
          textNode.textContent = textNode.textContent.substr(0, textNode.textContent.length - nextChunk.length);

          emitCallback('page', toNode.cloneNode(true));

          // Put our next chunk back in the queue to be processed, and
          // reset our destination collector to the current hierarchy.
          textChunks.unshift(nextChunk);
          l++;
          reset();

          // Now that we've reset the currentNode (which is prepped with
          // a blank text node, we need to point our text node at that.
          textNode = currentNode.lastChild;
          space = '';
        }
      }

      var tmpDelay = delay;
      delay = 0;

      setTimeout(function continueSlow () { c(); }, tmpDelay);
    };
  };

  // The actual paginate function. Provided only to allow deferred starts.
  this.paginate = function () {
    new Sax.Parser(fromNode, nodeHandler).parse();
  };
};
