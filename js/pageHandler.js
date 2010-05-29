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
  self.displayElements = displayElements;
  self.collectorBase = self.displayElements[0];

  this.sectionsByName = {};

  var loadingIndicator;
  var waiting = 0;

  this.setPages = function (dspElements) {
    // We need to reset the page numbering, since n>1 page layouts can have
    // blank pages between chapters.
    if (self.displayElements.length != dspElements.length) {
      pageCounts = [0];
    }

    self.displayElements = dspElements;
  }

  var showLoadingIndicator = function (t) {
    loadingIndicator = setTimeout( function () {
      document.getElementById('spinner').style.display = 'block';
    }, t);
  };

  var hideLoadingIndicator = function () {
    clearTimeout(loadingIndicator);
    document.getElementById('spinner').style.display = 'none';
  };

  var recalculatePageNumbers = function () {
    for (var i = 1, l = sections.length; i < l; i++) {
      if (pageCounts[i] >= 0) {
        continue;
      } else {
        var sectionOffset = sections[i - 1].pageCount + pageCounts[i - 1];
        var roundingCorrection = sections[i - 1].pageCount % self.displayElements.length;
        pageCounts[i] = sectionOffset + roundingCorrection;
      }
    }
  };

  var showPageNumber = function (pageIdx, pageOffset) {

    if (pageNumbers) {
      if (!(pageCounts[currSection] >= 0)) {
        recalculatePageNumbers();
      }

      pageNumbers[pageIdx].textContent = pageCounts[currSection] + pageOffset;
    }
  };

  // TODO: This is a hard-coded hack, should be made modular.
  this.pageRenderer = function () {
    var totalPageCount = pageCounts.length;
    for (var i = pageCounts.length - 1; i >= 0; i--) {
      if (!pageCounts[i]) continue;

      totalPageCount = pageCounts[i];
      break;
    }

    var currPage = pageCounts[currSection] + sections[currSection].currPage;
    if (!currPage) currPage = Math.min(currSection, totalPageCount - 1);
    if (currPage >= totalPageCount) currPage = currPage - 1;

    drawPct(currPage / totalPageCount);
  };

  this.pageDisplayer = function (pageIdx) {

    this.pageRenderer();

    // Expect to get called within 50 ms, or display the loading indicator.
    showLoadingIndicator(50);
    waiting++;

    return function (page) {
      if (page === null) {
        self.displayElements[pageIdx].innerHTML = '';
        showPageNumber(pageIdx, sections[currSection].currPage + 1);
      } else {
        self.displayElements[pageIdx].innerHTML = page.innerHTML;
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
      if (sections.length > currSection + 1) {
        currSection += 1;
        sections[currSection].seekBeginning();
      } else {
        // do nothing.
        return;
      }
    }

    for (var i = 0, l = self.displayElements.length; i < l; i++) {
      sections[currSection].nextPage(self.pageDisplayer(i));
    }
  };

  this.prevPage = function () {
    
    // Don't go back a page if we're already trying to do a page movement.
    if (waiting > 0) return;

    if (sections[currSection].currPage <= self.displayElements.length) {

      if (currSection > 0) {

        sections[--currSection].seekEnd( function (sectionLength) {
            var blanks = sectionLength % self.displayElements.length;
            sections[currSection].rewind(self.displayElements.length - blanks);
            self.nextPage();
          }
        );
      }
    } else {
      sections[currSection].rewind(self.displayElements.length * 2);
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
          var img;
          if (image.getAttribute('src')) {
            var img = book.getFile(image.getAttribute('src'));
          } else {
            var img = book.getFile(image.getAttribute('xlink:href'));
          }

          if (!img) return;
          
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

var accum = 0;
var naccum = 0;
  this.display = function () {

    var l = book.contents.length;
    function loadSection (n) {
      if (n < l) {
var startTime = new Date();
        // Load section n, and schedule the next section to load in 100ms.
        sections[n].loadCallback( function (loaded) {
var finishTime = new Date();
console.log("Loading section " + n + " took " + (finishTime - startTime) + "ms");
accum += finishTime - startTime;
naccum++;
          if (loaded) {
            setTimeout( function () { loadSection(n+1) }, 20);
          }
        });
      } else {
        console.log('average: ' + (accum / naccum));
      }
    }

    loadSection(0);
    this.nextPage();
  }
};
