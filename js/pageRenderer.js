var drawLeftPage = function (canvas,
                             center, top, width, height,
                             curlRadiusX, curlRadiusY,
                             vOffset, hOffset, maxCurlRadiusY, fill) {

   // Left Page
   var bottom = top + height,
         left = center - width - hOffset;

   canvas.beginPath();
   canvas.moveTo(center, top + curlRadiusY + vOffset);

   // Spine
   canvas.lineTo(center, bottom + maxCurlRadiusY);
   canvas.lineTo(center, bottom + maxCurlRadiusY);

   // Bottom curl.
   canvas.bezierCurveTo(center - curlRadiusX / 4 - hOffset, bottom + vOffset - curlRadiusY / 2,
                        center - curlRadiusX - hOffset, bottom + vOffset - curlRadiusY / 2,
                        center - curlRadiusX - hOffset, bottom + vOffset - curlRadiusY / 2);

   // Bottom Page Edge
     canvas.bezierCurveTo((center + left) / 2, bottom + vOffset / 2 - curlRadiusY / 2,
                          (center + left) / 2, bottom + vOffset,
                          left + 1, bottom + vOffset);
//  canvas.lineTo(left + 1, bottom + vOffset);

  // Left Edge with Rounded Corners
  canvas.quadraticCurveTo(left, bottom + vOffset, left, bottom + vOffset - 1);
  canvas.lineTo(left, top + vOffset + 1);
  canvas.quadraticCurveTo(left + 1, top + vOffset, left, top + vOffset);

  // Top Page Edge
  canvas.bezierCurveTo((center + left) / 2, top + vOffset,
                       (center + left) / 2, top + vOffset / 2 + curlRadiusY / 2,
                       center - curlRadiusX, top + vOffset);
  // canvas.lineTo(center - curlRadiusX, top + vOffset + 1);

  // Top Curl
  canvas.bezierCurveTo(center - curlRadiusX / 2, top + vOffset,
                       center, top + vOffset + curlRadiusY / 2,
                       center, top + curlRadiusY + vOffset);

  if (fill) {
    var strokeGradient = canvas.createLinearGradient(left, bottom, center, 0);
    strokeGradient.addColorStop(0, 'rgb(194, 190, 184)');
    strokeGradient.addColorStop(1 - (curlRadiusX / width * 0.5), 'rgb(234, 230, 224)');
    canvas.strokeStyle = strokeGradient; 
  } else {
    canvas.strokeStyle = 'rgb(194,190,184)'
  }
  canvas.stroke();

  if (fill) {
    var fillGradient = canvas.createLinearGradient(left, 0, center, 0 + curlRadiusX / 8);
    fillGradient.addColorStop(1 - (curlRadiusX / width * 0.8), 'rgb(250, 246, 240)');
    fillGradient.addColorStop(1, 'rgb(234, 230, 224)');
    canvas.fillStyle = fillGradient;
    canvas.fill();
  }


  canvas.closePath();

}

var drawRightPage = function (canvas,
                              center, top, width, height,
                              curlRadiusX, curlRadiusY,
                              vOffset, hOffset, maxCurlRadiusY, fill) {

  // Left Page
  var bottom = top + height,
      right = center + width + hOffset;

  canvas.beginPath();
  canvas.moveTo(center, top + curlRadiusY + vOffset);

  // Spine
  canvas.lineTo(center, bottom + maxCurlRadiusY);
  canvas.lineTo(center, bottom + maxCurlRadiusY);

  // Bottom curl.
  canvas.bezierCurveTo(center + curlRadiusX / 2 + hOffset, bottom + vOffset - curlRadiusY / 2,
                       center + curlRadiusX + hOffset, bottom + vOffset - curlRadiusY / 2,
                       center + curlRadiusX + hOffset, bottom + vOffset - curlRadiusY / 2);

  // Bottom Page Edge
  canvas.bezierCurveTo((center + right) / 2, bottom + vOffset / 2 - curlRadiusY / 2,
                       (center + right) / 2, bottom + vOffset,
                       right - 1, bottom + vOffset);
//  canvas.lineTo(right - 1, bottom + vOffset);

  // Left Edge with Rounded Corners
  canvas.quadraticCurveTo(right, bottom + vOffset, right, bottom + vOffset - 1);
  canvas.lineTo(right, top + vOffset + 1);
  canvas.quadraticCurveTo(right - 1, top + vOffset, right, top + vOffset);

  // Top Page Edge
  canvas.bezierCurveTo((center + right) / 2, top + vOffset / 2 + curlRadiusY / 2,
                       (center + right) / 2, top + vOffset,
                       center + curlRadiusX, top + vOffset);
  //          canvas.lineTo(center + curlRadiusX, top + vOffset);

  // Top Curl
  canvas.bezierCurveTo(center + curlRadiusX / 2, top + vOffset,
                       center, top + vOffset + curlRadiusY / 2,
                       center, top + curlRadiusY + vOffset);

  if (fill) {
    var strokeGradient = canvas.createLinearGradient(right, bottom, center, 0);
    strokeGradient.addColorStop(0, 'rgb(194, 190, 184)');
    strokeGradient.addColorStop(1 - (curlRadiusX / width * 0.5), 'rgb(234, 230, 224)');
    canvas.strokeStyle = strokeGradient;
  } else {
    canvas.strokeStyle = 'rgb(194,190,184)'
  }
  canvas.stroke();

  if (fill) {
    var fillGradient = canvas.createLinearGradient(right, 0, center, 0);
    fillGradient.addColorStop(1 - (curlRadiusX / (width * 0.8)), 'rgb(250, 246, 240)');
    fillGradient.addColorStop(1, 'rgb(234, 230, 224)');
    canvas.fillStyle = fillGradient;
    canvas.fill();
  }

  canvas.closePath();
}

function drawPct(pct) {
  var canvas = document.getElementById('background');
  var context = canvas.getContext('2d');

  var width = canvas.width / 2;
  var height = canvas.height;

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  pct = Math.min(1, pct);
  pct = Math.max(0, pct);

  var thickness = 20;

  for (var i = thickness; i >= Math.ceil(pct * thickness); i--) {
        var x = Math.max(1, i);
        var fill = i == Math.ceil(pct*thickness);
        drawRightPage(context,
                      width, 0, width - Math.log(thickness + 1) * 10, height - Math.log(thickness) * 6,
                      Math.log((thickness - x) + 2) * 10, Math.log((thickness - x) + 2) * 4, Math.log(x + 2) * 4, Math.log(x + 2) * 8,
                      Math.log(thickness + 2) * 4, fill);
  }

  for (var i = 0; i <= Math.ceil(pct*thickness); i++) {
        var x = Math.max(1, thickness - i);
        var fill = i == Math.ceil(pct*thickness);
        drawLeftPage(context,
                     width, 0, width - Math.log(thickness + 1) * 10, height - Math.log(thickness) * 6,
                     Math.log((thickness - x) + 2) * 10, Math.log((thickness - x) + 2) * 4,
                     Math.log(x + 2) * 4, Math.log(x + 2) * 8,
                     Math.log(thickness + 2) * 4, fill);
  }
}
