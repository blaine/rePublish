var swipe = function () {

  var startEvent = {},
      endEvent = {};

  var body = document.getElementsByTagName('body')[0];

  body.addEventListener('touchstart', function (event) {
    event.preventDefault();
    startEvent.x = event.touches[0].pageX;
    startEvent.y = event.touches[0].pageY;
  }, false);

  body.addEventListener('touchmove', function (event) {
    endEvent.x = event.touches[0].pageX;
    endEvent.y = event.touches[0].pageY;
  }, false);

  body.addEventListener('touchend', function (event) {
    var changeX = startEvent.x - endEvent.x,
        changeY = startEvent.y - endEvent.y,
        changeRatio = Math.abs(changeX / changeY);

    if (changeRatio > 2.5) {
      // The swipe was "clearly" dominant in either the X or Y directions.

      if (changeX < 0) {
        // Motion was left-to-right across the screen.
        pageHandler.prevPage()
      } else {
        // Motion was right-to-left across the screen.
        pageHandler.nextPage();
      }
    } else if (changeRatio < 0.4) {
      if (changeY < 0) {
        // Motion was top-to-bottom across the screen.
        pageHandler.prevPage();
      } else {
        // Motion was bottom-to-top across the screen.
        pageHandler.nextPage()
      }

    }

  }, false);

};
