/*

This is a holder for sections; each section needs to store an internal
reference to its own pages, since they are loaded internally via the
contentCallback.

While it would be possible to load all of the sections' pages into a single
array, doing so would make it impossible to access each section
independently (or, at least, much more difficult).

*/

var Section = function (contentCallback) {
  var pages = [],
      lastPage = -1;

  this.currPage = 0;

  var self = this;

  // loadCallback - calls the callback that will load and paginate the content
  // for this section.
  //
  // Calls c() twice if the section isn't loaded the first time around.

  var isLoading = false,
      callbackQueue = [];
  this.loadCallback = function (c) {

    if (lastPage == -1 && !isLoading) {
      isLoading = true;

      var finishLoad = function () {
        self.pageCount = pages.length;
        isLoading = false;

        // The first callback is the one that started the loading.
        c(true);

        // Once we've done that, clear out the pending queue.
        while (callbackQueue.length > 0) {
          callbackQueue.shift()(true);
        }
      }

      var addPage = function (page) {
        lastPage += 1;
        pages.push(page);
      }

      contentCallback(addPage, finishLoad);
    } else {
      c(!isLoading);
      callbackQueue.push(c);
    }
  }

  this.isFirstPage = function () {
    return self.currPage == 0;
  };

  this.seekBeginning = function () {
    self.currPage = 0;
  };

  this.rewind = function (n) {
    self.currPage = Math.max(self.currPage - n, 0);
  }

  this.isLastPage = function () {
    // Yeah, this could be more succinct, but this is more obvious.
    if (isLoading) {
      return false;
    } else if (self.currPage < lastPage + 1) {
      return false;
    } else {
      return true;
    }
  };

  // Seek to the end of a section. Waits for the section to fully load.
  //

  this.seekEnd = function (callback) {
    this.loadCallback(function (loaded) {
      if (loaded) {
        self.currPage = lastPage + 1;
        callback(lastPage + 1);
      }
    });
  };

  // Fetch the next page.
  //

  this.nextPage = function (callback) {

    // We ignore if the whole section is loaded here, triggering the callback
    // only when:
    //
    //   - the page is available
    //   - the page is never going to be available
      
    // loadCallback will fire twice if the section isn't loaded.
    this.loadCallback(function (loaded) {
      if (pages[self.currPage]) {
        // The page we're looking for is present. Go ahead and load it.
        callback(pages[self.currPage++]);
      } else if (loaded === true) {
        // There is no next page. Send null.
        callback(null);
      } 
    });
  };

  // Fetch the previous page.
  // 

  this.prevPage = function (callback) {

    // Moving forward in the section always waits for the whole section to load
    // so we don't need to do any checks here to see if it is loaded.

    if (self.currPage > 0) {
      callback(pages[--self.currPage]);
    } else {
      callback(null);
    }
  }
};
