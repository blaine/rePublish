/*

+PageHandler+ takes a reference to a book, from which it extracts content.

+PageHandler+ takes an array of +displayElement+s, which are document elements
in which we wish to display the book, and paginates according to the size of
the first of those elements (the assumption is that they are all sized
equally).

It then provides methods to move forwards and backwards in a book, loading
sections as necessary so as to prevent pre-loading the entire book (which
can be quite time consuming, and is unnecessary).

Optional arguments may be supplied, including +pageNumbers+ (an array of
elements whose textContent will be set to the current corresponding page
number) and +chapterName+, whose textContent will be set to the current
chapter name, if any.

*/

var PageHandler = function (book, displayElements, pageNumbers, chapterName) {
  var sections = [],
      pageCounts = [0],
      currSection = 0;
   
  var self = this;

  self.sections = sections;
  self.collectorBase = displayElements[0];

  var loadingIndicator;
  var waiting = 0;

  var showLoadingIndicator = function (t) {
    loadingIndicator = setTimeout( function () {
      document.getElementById('spinner').style.display = 'block';
    }, t);
  };

  var hideLoadingIndicator = function () {
    clearTimeout(loadingIndicator);
    document.getElementById('spinner').style.display = 'none';
  };

  var showPageNumber = function (pageIdx, pageOffset) {

    // Update page numbering. Needs a fix for entering sections midway through
    // the book.
    for (var i = pageCounts.length - 1, l = currSection; i < l; i++) {
      if (sections[i].pageCount) {
        pageCounts[i+1] = pageCounts[i] + sections[i].pageCount + (sections[i].pageCount % displayElements.length);
      }
    }

    if (pageNumbers) {
      pageNumbers[pageIdx].textContent = pageCounts[currSection] + pageOffset;
    }
  };

  this.pageDisplayer = function (pageIdx) {

    // Expect to get called within 50 ms, or display the loading indicator.
    showLoadingIndicator(50);
    waiting++;

    return function (page) {
      if (page === null) {
        displayElements[pageIdx].innerHTML = '';
        showPageNumber(pageIdx, sections[currSection].currPage + 1);
      } else {
        displayElements[pageIdx].innerHTML = page.innerHTML;
        showPageNumber(pageIdx, sections[currSection].currPage);
      }

      if (--waiting <= 0) {
        hideLoadingIndicator();
        waiting = 0;
      }
    }
  };

  this.nextPage = function () {

    if (waiting > 0) return;

    // Move to the next section if we're at the end of this one.
    if (sections[currSection].isLastPage()) {
      if (sections[currSection + 1]) {
        currSection += 1;
        sections[currSection].seekBeginning();
      } else {
        // do nothing.
        return;
      }
    }

    for (var i = 0, l = displayElements.length; i < l; i++) {
      sections[currSection].nextPage(self.pageDisplayer(i));
    }
  };

  this.prevPage = function () {
    
    if (waiting > 0) return;

    if (sections[currSection].currPage <= displayElements.length) {

      if (currSection > 0) {

        sections[--currSection].seekEnd( function (sectionLength) {
            var blanks = sectionLength % displayElements.length;
            sections[currSection].rewind(displayElements.length - blanks);
            self.nextPage();
          }
        );
      }
    } else {
      sections[currSection].rewind(displayElements.length * 2);
      self.nextPage();
    }
  };

  this.goToSection = function (secName) {
    currSection = this.sectionsByName[secName];
    sections[currSection].seekBeginning();
  };

  /*
   * 
   *  The content collector. This uses the first displayElement as a template
   *  to paginate the text. We call it from pageHandler.addSection to generate
   *  callbacks that will return content for us when we need it.
   * 
   */

  var contentsLoader = function () {
    var parser = new DOMParser();

    var getNewCollector = function () {
      var contentCollector = self.collectorBase.cloneNode(false);
      contentCollector.id = 'contentCollector';
      contentCollector.style.marginTop = '10000px';
      self.collectorBase.parentNode.appendChild(contentCollector);

      return contentCollector;
    };

    return function (contentChunk) {
      return function (addPageCallback, finishCallback) {
        var contentDoc = parser.parseFromString(contentChunk.content(), 'application/xml'),
            contentHeader = contentDoc.getElementsByTagName('head')[0],
            contentContainer = contentDoc.getElementsByTagName('body')[0];

        var contentCollector = getNewCollector();

        var styleContent;
        for (var i = 0, l = contentHeader.children.length; i < l; i++) {
          var elem = contentHeader.children[i];
          
          if (elem.nodeName == 'link' && elem.rel == 'stylesheet') {
            if (!styleContent) styleContent = '';
            styleContent += book.getFile(elem.getAttribute('href')).content();
          } else if (elem.nodeName == 'style') {
            if (!styleContent) styleContent = '';
            styleContent += elem.textContent;
          }
        }

        if (!document.getElementById('rePublishStyle')) {
          var ssheet = document.createElement('style');
          ssheet.id = 'rePublishStyle';
          ssheet.textContent = styleContent;
          document.getElementsByTagName('head')[0].appendChild(ssheet);
        } else {
          var ssheet = document.getElementById('rePublishStyle');
          ssheet.textContent = styleContent;
        }

        var paginator = new Paginator(contentContainer, contentCollector, styleContent);

        paginator.addCallback('page', function (page) {
          addPageCallback(page, contentHeader);
        });

        paginator.addCallback('finish', function () {
          contentCollector.parentNode.removeChild(contentCollector);
          finishCallback();
        });

        paginator.addCallback('image', function (image) {
          var img = book.getFile(image.getAttribute('src'));
          var imgContent = img.content();
          var b64imgContent = Base64.encode(imgContent);

          try {
            var sz = getImageSize(imgContent);
            if (sz) {
              image.width = sz.width;
              image.height = sz.height;
            }
          } catch (e) {
            // console.log('error finding image size for ' + image.getAttribute('src'));
          }

          var imgType = img.name.substr(img.name.lastIndexOf('.') + 1, img.name.length);
          var dataUri = "data:image/" + imgType + ";base64," + b64imgContent;
          image.setAttribute('src', dataUri);
        });

        paginator.paginate();
      };
    };
  }();

  // addSection takes a callback function that will open the section
  this.addSection = function (contentRef) {
    var func = contentsLoader(contentRef);

    var section = new Section(func);
    this.sections.push(section);
    this.sectionsByName[contentRef.name] = sections.length - 1;

    return section;
  };


  // Load the book sections.
  for (var i = 0, l = book.contents.length; i < l; i++) {
    this.addSection(book.contents[i]);
  }

  this.display = function () {

    var l = book.contents.length;
    function loadSection (n) {
      if (n < l) {
        // Load section n, and schedule the next section to load in 100ms.
        sections[n].loadCallback( function (loaded) {
          if (loaded) {
            setTimeout( function () { loadSection(n+1) }, 100);
          }
        });
      }
    }

    loadSection(0);
    this.nextPage();
  }
};
