/*
 * +PageHandler+ takes a reference to a book, from which it extracts content.
 *
 * +PageHandler+ takes an array of +displayElement+s, which are document elements
 * in which we wish to display the book, and paginates according to the size of
 * the first of those elements (the assumption is that they are all sized
 * equally).
 *
 * It then provides methods to move forwards and backwards in a book, loading
 * sections as necessary so as to prevent pre-loading the entire book (which
 * can be quite time consuming, and is unnecessary).
 *
 * Optional arguments may be supplied, including +pageNumbers+ (an array of
 * elements whose textContent will be set to the current corresponding page
 * number) and +chapterName+, whose textContent will be set to the current
 * chapter name, if any.
 *
 */

var PageHandler = function (book, displayElements, pageNumbers, chapterName) {
  var sections = [],
      pageCounts = [0],
      currSection = 0;

  // Each section can display itself. We can fast-forward it in case
  // we're coming at the section from behind, or we can rewind it in
  // case we're approaching it from the head.
  var Section = function (callback) {
    var pages = [],
        currPage = 0,
        lastPage = -1;

    this.currPage = function () { return currPage };

    this.loadCallback = function () {
      if (lastPage > -1) return;

      callback(this);
      gpages = pages;

      while (pages.length % displayElements.length !== 0) {
        // This page intentionally left blank.
        this.addPage(document.createTextNode(""));
      }

      lastPage = pages.length - displayElements.length;
      this.pageCount = pages.length;
    }

    this.display = function () {
      this.loadCallback();

      for (i = 0, l = displayElements.length; i < l; i++) {
        if (pages[currPage + i]) {
          displayElements[i].innerHTML = '';
            for (var j = 0, k = pages[currPage + i].childNodes.length; j < k; j++) {
              
          displayElements[i].appendChild(pages[currPage + i].childNodes[j].cloneNode(true));
            }
          //displayElements[i].appendChild(pages[currPage + i]);
        }
      }
    };

    this.isFirstPage = function () {
      return currPage == 0;
    };

    this.seekBeginning = function () {
      this.loadCallback();
      currPage = 0;
    };

    this.isLastPage = function () {
      this.loadCallback();
      return lastPage === currPage;
    };

    this.seekEnd = function () {
      this.loadCallback();
      currPage = lastPage;
    };

    this.nextPage = function () {
      this.loadCallback();
      if (!this.isLastPage()) {
        currPage += displayElements.length;
      }
    };

    this.prevPage = function () {
      this.loadCallback();
      currPage = Math.max(0, currPage - displayElements.length);
    }

    this.addPage = function (page) {
      pages.push(page);
    };
  };
    
  this.display = function () {
    sections[currSection].display();

    // Count sections that we haven't yet counted. This will likely
    // need some modification for entry at the middle of a book.
    var count = 0;
    for (var i = pageCounts.length - 1, l = currSection; i < l; i++) {
      if (sections[i].pageCount) {
        pageCounts[i+1] = pageCounts[i] + sections[i].pageCount;
      }
    }

    if (pageNumbers) {
      for (var i = 0, l = pageNumbers.length; i < l; i++) {
        if (pageNumbers[i]) {
          pageNumbers[i].textContent = pageCounts[currSection] + sections[currSection].currPage() + i + 1;
        }
      }
    }

    // After we display, try loading ahead a few sections.
    for (var i = 1; i < 4; i++) {
      var s = function (v) {
        setTimeout(function () {
          if (currSection + v < sections.length) {
            sections[currSection + v].loadCallback()
          }
        }, v * 10);
      }(i);
    }
  };


  this.nextPage = function () {
    if (sections[currSection].isLastPage()) {
      if (sections[currSection + 1]) {
        currSection += 1;
        sections[currSection].loadCallback();
      }
    } else {
      sections[currSection].nextPage();
    }

    this.display();
  };

  this.prevPage = function () {
    if (sections[currSection].isFirstPage()) {
      if (currSection > 0) {
        currSection -= 1;
        sections[currSection].seekEnd();
      }
    } else {
      sections[currSection].prevPage();
    }

    this.display();
  };
  
  // addSection takes a callback function that will open the section
  this.addSection = function (contentRef) {
    var func = this.contentsLoader(contentRef);

    section = new Section(func);
    sections.push(section);

    return section;
  };

  /*
   * 
   *  The content collector. This uses the first displayElement as a template
   *  to paginate the text. We call it from pageHandler.addSection to generate
   *  callbacks that will return content for us when we need it.
   * 
   */

  var collectorBase = displayElements[0];
  
  var getNewCollector = function () {
    var contentCollector = collectorBase.cloneNode(false);
    contentCollector.id = 'contentCollector';
    collectorBase.parentNode.appendChild(contentCollector);

    return contentCollector;
  };

  this.contentsLoader = function () {
    var parser = new DOMParser();

    return function (contentChunk) {
      return function (pageTarget) {
        var contentDoc = parser.parseFromString(contentChunk.content(), 'application/xml'),
            contentContainer = contentDoc.getElementsByTagName('body')[0];

        var contentCollector = getNewCollector();

        var paginator = new Paginator(contentContainer, contentCollector);

        paginator.addCallback('page', function (page) {
          pageTarget.addPage(page);
        });

        paginator.addCallback('finish', function () {
          contentCollector.parentNode.removeChild(contentCollector);
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
//            console.log('error finding image size for ' + image.getAttribute('src'));
          }

          var imgType = img.name.substr(img.name.lastIndexOf('.') + 1, img.name.length);
          var dataUri = "data:image/" + imgType + ";base64," + b64imgContent;
          image.setAttribute('src', dataUri);
        });

        paginator.paginate();
      };
    };
  }();

  // Actually load the book sections.
  for (var i = 0, l = book.contents.length; i < l; i++) {
    var section = this.addSection(book.contents[i]);
  }

};
