var pngMagicNum = "\211PNG\r\n\032\n";
var jpgMagicNum = "\377\330";
var gifMagicNum = "GIF8";

var getImageSize = function (imageData) {
  var nextByte = function() {
    return imageData.charCodeAt(pos++);
  }

  if (imageData.substr(0, 8) === pngMagicNum) {

    // PNG. Easy peasy.
    var pos = imageData.indexOf('IHDR') + 4;

    return { width:  (nextByte() << 24) | (nextByte() << 16) |
                     (nextByte() <<  8) | nextByte(),
             height: (nextByte() << 24) | (nextByte() << 16) |
                     (nextByte() <<  8) | nextByte() };

  } else if (imageData.substr(0, 4) === gifMagicNum) {
    pos = 6;

    return { width:  (nextByte() << 8) | nextByte(),
             height: (nextByte() << 8) | nextByte() };

  } else if (imageData.substr(0, 2) === jpgMagicNum) {

    pos = 2;

    var l = imageData.length;
    while (pos < l) {
      if (nextByte() != 0xFF) return;

      var marker = nextByte();
      if (marker == 0xDA) break;

      size = (nextByte() << 8) | nextByte();

      if (marker >= 0xC0 && marker <= 0xCF && !(marker & 0x4) && !(marker & 0x8)) {
        pos += 1;
        return { height:  (nextByte() << 8) | nextByte(),
                 width: (nextByte() << 8) | nextByte() };

      } else {
        pos += size - 2;
      }
    }
  }
};
