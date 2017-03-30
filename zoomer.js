var zoomer = function() {

	var zoomBackground = null;
	var zoomImage = '';

	var imageOriginalHeight;
	var imageOriginalWidth;

	var createTimer = null;
	var hideTimer = null;

	var zoomLevel;

	var lastMoveTarget = null;
	var mouseInsideZoomPanel = false;
	var lastMouseCoords = null;
	var lastLargeImageSrc = null;

	var getTarget = function(e) {

		if (('undefined' == typeof e) || !e)
			return null;
		var target = "";
		if (e.target) {
			target = e.target;
		} else if (e.srcElement) {
			target = e.srcElement;
		}
		return target;
	}

	var getZoomedImageSrc = function(target) {

		if (!target.tagName)
			return false;
		var eventElementName = target.tagName.toLowerCase();

		var parentClassName = target.parentNode.className;
		var isImage = (eventElementName == 'img');

		if (!isImage && $(target).hasClass("uiScaledImageContainer")) {
			var found = $(target).find("img.scaledImageFitWidth");
			if (found.length > 0) {
				var img = found[0];
				target = img;
				eventElementName = target.tagName.toLowerCase();
				isImage = (eventElementName == 'img');
			}
		}

		if (!isImage) {
			zoomHide();
		}

		var isI = (eventElementName == 'i' && (/MediaThumb/
				.test(parentClassName)
				|| (/tagWrapper/.test(parentClassName) && /MediaThumb/
						.test(target.parentNode.parentNode.className))
				|| /PhotoThumb/.test(target.parentNode.parentNode.className)
				|| /profilePicContainer/
						.test(target.parentNode.parentNode.className) || /uiScaledThumb/
				.test(target.parentNode.parentNode.className)));

		var isA = (eventElementName == 'a' && (/photoRedesign/
				.test(parentClassName) || /uiStreamAttachments/
				.test(parentClassName)));
		var isDiv = (eventElementName == 'div' && /uiScaledThumb/
				.test(parentClassName));

		if (!(isImage || isI || isA || isDiv)) {
			return false;
		}

		if (target.className.match(/shareMediaPhoto/)) {
			return false;
		}

		if (target.className
				.match(/-cx-PRIVATE-uiSquareImage__root|UIImageBlock_SMALL_Image/)) {
			haveFacebookTooltip = true;
		}

		else {
			haveFacebookTooltip = false;
		}

		var smallImageSrc = '';
		smallImageSrc = (isImage) ? target.src : target.style.backgroundImage
				.substring(4, target.style.backgroundImage.length - 1);
		if (isFireFox()) {
			if (isI)
				smallImageSrc = smallImageSrc.substring(1,
						smallImageSrc.length - 1);
		}
		if (isA || isDiv) {
			smallImageSrc = target.childNodes[0].src;
		}
		var largeImageSrc = '';
		if (isImage) {
			largeImageSrc = smallImageSrc;
		}

		if (smallImageSrc) {

			var option1 = /_[aqst]\.(jpe?g)$/i;
			var option2 = /[aqst]([\d_]+)\.(jpe?g)$/i;
			var option3 = /\/[a-z][\d]+x[\d]+/g;
			var option4 = /[a-z][\d]*\.[\d]*\.[\d]*\.[\d]*/g;
			if (option1.test(smallImageSrc)) {
				largeImageSrc = smallImageSrc.replace(option1, "_n.$1");
			} else if (option2.test(smallImageSrc)) {
				largeImageSrc = smallImageSrc.replace(option2, "n$1.$2");
			} else if (option3.test(smallImageSrc)) {
				largeImageSrc = smallImageSrc.replace(option3, "");
			}
			if (option4.test(largeImageSrc)) {
				largeImageSrc = largeImageSrc.replace(option4, "");
			}
		}
		return largeImageSrc;
	};

	var onImageLoad = function() {
		zoomUpdatePosition();
	};

	var onMouseMove = function(e) {

		var evt = e || window.event;

		if ('undefined' == typeof evt || !evt)
			return;

		// Check if mouse moved over another element
		var target = getTarget(evt);
		// Check if element under mouse cursor is the same as last time
		if (target == lastMoveTarget) {
			return;
		}

		lastMoveTarget = target;

		// Check if mouse is hovering over our own zoom panel
		if (target == zoomImage || target == zoomBackground) {
			mouseInsideZoomPanel = true;
			clearHideTimer();
			return;
		}

		zoom(evt);
	};
	// BROWSER CHECKS
	// =========================================================================

	isIE = function() {
		try {
			return window.ActiveXObject ? true : false;
		} catch (ex) {
			// alert("isIE exception: "+ ex.message);
		}
		return false;
	};

	isIE9 = function() {
		return navigator.userAgent.indexOf("9.0") > -1;
	};

	isChrome = function() {
		return navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
	};

	isSafari = function() {
		return navigator.userAgent.toLowerCase().indexOf("safari") > -1;
	};

	isFireFox = function() {
		return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
	};
	// ===========================================================================================

	var zoomHide = function() {

		clearCreateTimer();
		// If there's no zoom panel
		if (!zoomBackground)
			return;

		lastLargeImageSrc = null;

		if (!hideTimer) {
			hideTimer = setTimeout(_onZoomHideTimeout, 300);
		}
	};

	var _onZoomHideTimeout = function() {
		hideTimer = null;
		_zoomHide();
	};

	var _zoomHide = function() {
		try {
			zoomBackground.parentNode.removeChild(zoomBackground);

			zoomBackground = null;
			zoomImage = null;
		} catch (e) {
			console.log('_zoomHide ' + e.message);
		}
	};

	var clearHideTimer = function() {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	};

	var clearCreateTimer = function() {
		if (createTimer) {
			clearTimeout(createTimer);
			createTimer = null;
		}
	};

	var zoom = function(e) {
		try {

			var target = getTarget(e);

			var largeImageSrc = getZoomedImageSrc(target);
			// If we can't detect a zoomed version of this element
			if (!largeImageSrc) {
				zoomHide();

				return;
			}

			// If zoomed version url haven't changed since last time
			if (zoomBackground && zoomImage && zoomImage.src == largeImageSrc) {
				clearHideTimer();
				return;
			}

			var mouseCoords = {
				x : e.clientX,
				y : e.clientY
			};
			lastMouseCoords = mouseCoords;

			zoomLevel = 100;
            if(/=(\d\d)x(\d\d)/.test(largeImageSrc)) {
                zoomCreate(largeImageSrc);
            }

		} catch (ee) {

		}
	};

	var zoomCreate = function(largeImageSrc) {
		lastLargeImageSrc = largeImageSrc;

		clearHideTimer();

		if (!createTimer) {
			createTimer = setTimeout(_zoomCreate, 200);
		}
	};

	var _zoomCreate = function() {
		try {

			// get zoom level which could change d

			createTimer = null;

			var doc = document;

			if (zoomBackground) {
				_zoomHide();
			}

			zoomBackground = doc.createElement("span");
			//zoomBackground.tHeadtAttribute('id', 'webZoomImage');
			zoomBackground.style.zIndex = '10000';
			zoomBackground.style.padding = '0px';
			zoomBackground.style.border = 'solid 1px black';
			zoomBackground.style.position = 'absolute';

			zoomBackground.style.display = 'none';
			zoomBackground.innerHTML = "";
			doc.body.appendChild(zoomBackground);

			zoomImage = doc.createElement("img");
			zoomImage.setAttribute('id', 'webZoomPic');

			zoomImage.onload = onImageLoad;

			zoomImage.src = lastLargeImageSrc.replace(/=(\d\d)x(\d\d)/, "=400x400");
			zoomBackground.style.display = 'block';
			zoomBackground.appendChild(zoomImage);

			//zoomUpdatePosition();


		} catch (e) {
			console.log('_zoomCreate:   ' + e.message);
		}
	};

	var zoomUpdatePosition = function(mouseCoords) {
		if ('undefined' == typeof mouseCoords) {
			mouseCoords = lastMouseCoords;
		} else {
			lastMouseCoords = mouseCoords;
		}

		try {
			var scrollPos;
			var pageSize;
			var naturalHeight;
			var naturalWidth;

			if (isIE()) {
				scrollPos = {
					x : document.body.parentNode.scrollLeft,
					y : document.body.parentNode.scrollTop
				};
				pageSize = {
					x : document.documentElement.clientWidth,
					y : document.documentElement.clientHeight
				};
				imageOriginalHeight = zoomImage.height;
				imageOriginalWidth = zoomImage.width;
				naturalHeight = imageOriginalHeight;
				naturalWidth = imageOriginalWidth;
			} else {
				if (isFireFox()) {
					scrollPos = {
						x : content.window.scrollX,
						y : content.window.scrollY
					};
					pageSize = {
						x : content.document.documentElement.clientWidth,
						y : content.document.documentElement.clientHeight
					};
				} else {
					scrollPos = {
						x : window.scrollX,
						y : window.scrollY
					};
					pageSize = {
						x : document.documentElement.clientWidth,
						y : document.documentElement.clientHeight
					};
				}
				imageOriginalHeight = zoomImage.naturalHeight;
				imageOriginalWidth = zoomImage.naturalWidth;
				naturalHeight = imageOriginalHeight;
				naturalWidth = imageOriginalWidth;
			}

			/*if (naturalHeight > 0 && naturalWidth > 0){
				naturalHeight = (imageOriginalHeight / 100) * zoomLevel;
				naturalWidth = (imageOriginalWidth / 100) * zoomLevel;
			}*/


			var imgSize = {
				x : naturalWidth,
				y : naturalHeight
			};

			var hoverEyeCandy = 12;
			var hoverMouseOffset = 18;
			var hoverPos = {
				x : 0,
				y : 0
			};

			hoverPos.x = mouseCoords.x + scrollPos.x + hoverMouseOffset;
			hoverPos.y = mouseCoords.y + scrollPos.y + hoverMouseOffset;

			var lastTargetOffset = $(lastMoveTarget).offset();

			if (haveFacebookTooltip) {
				hoverPos.x = Math.round(lastTargetOffset.left) - imgSize.x - 2
						* hoverEyeCandy;
			}

			var hoverSize = {
				x : imgSize.x + hoverEyeCandy,
				y : imgSize.y + hoverEyeCandy
			};

			if (hoverPos.x + imgSize.x + hoverEyeCandy >= scrollPos.x
					+ pageSize.x) {
				var tooBig = true;
				var leftSpace = hoverPos.x;
				var rightSpace = (scrollPos.x + pageSize.x) - hoverPos.x;

				if (rightSpace <= leftSpace) {
					hoverPos.x -= (hoverMouseOffset * 2 + imgSize.x + hoverEyeCandy * 2);
					tooBig = hoverPos.x < 0;
				}

				if (tooBig) {
					if (hoverPos.x < 0) {
						imgSize.x -= -hoverPos.x;
						hoverPos.x = 0;
					} else {
						imgSize.x -= ((hoverPos.x + imgSize.x + hoverEyeCandy) - pageSize.x);
					}

					imgSize.y *= (imgSize.x / naturalWidth);
					imgSize.y = parseInt(imgSize.y);

					// Buzzbox.Util.log('LIMIT zoom image dimensions: ' +
					// imgSize.x + ' x ' + imgSize.y);

					zoomImage.width = imgSize.x + 'px';
					zoomImage.height = imgSize.y + 'px';
				}
			}

			if (hoverPos.y + imgSize.y + hoverEyeCandy > scrollPos.y
					+ pageSize.y) {
				hoverPos.y = (scrollPos.y + pageSize.y)
						- (imgSize.y + hoverEyeCandy);
			}

			if (hoverPos.x < 0)
				hoverPos.x = 0;
			// If zoomed image is higher than window
			if (hoverPos.y < scrollPos.y) {
				hoverPos.y = scrollPos.y;

				imgSize.y = pageSize.y - hoverEyeCandy;

				imgSize.x *= (imgSize.y / naturalHeight);
				imgSize.x = parseInt(imgSize.x);

				zoomImage.width = imgSize.x + 'px';
				zoomImage.height = imgSize.y + 'px';
			}

			zoomBackground.style.left = hoverPos.x + 'px';
			zoomBackground.style.top = hoverPos.y + 'px';

			if ((zoomImage.src && zoomImage.complete)
					&& (imgSize.x > 0 && imgSize.y > 0)
					&& (imgSize.x < 100 || imgSize.y < 100)) {
				zoomBackground.style.minWidth = imgSize.x + 'px';
				zoomBackground.style.minHeight = imgSize.y + 'px';
			}

			var x = zoomBackground.style.left;
			var y = zoomBackground.style.top;
			var width = imgSize.x;
			var height = imgSize.y;
			var mwidth = pageSize.x - x - 10;
			var mheight = pageSize.x - y - 10;
			var percent;
			if (width > mwidth) {
				percent = mwidth / width;
				width = mwidth;
				height = height * percent;
			}
			if (height > mheight) {
				percent = mheight / height;
				height = mheight;
				width = width * percent;
			}

			var zoomedWidth = width * (zoomLevel/100);
			var zoomedHeight = height * (zoomLevel/100);

			var ceilWidth = Math.ceil(zoomedWidth);
			var ceilHeight = Math.ceil(zoomedHeight);

			// If image dimensions are valid
			if (0 < ceilWidth && 0 < ceilHeight && 28 != ceilWidth
					&& 30 != ceilHeight) {

				// console.log("Set zoom image dimensions: "+imgSize.x + 'x' +
				// imgSize.y);
				zoomImage.style.width = ceilWidth + "px";
				zoomImage.style.height = ceilHeight + "px";
				zoomBackground.style.width = ceilWidth + "px";
				zoomBackground.style.height = ceilHeight + "px";
			}

		} catch (e) {
			// if (debug) console.log('zoomUpdatePosition ' + e.message);
		}
	};

	var setupPopup = function() {

		// zoom level input
		var $zoomLevelInput = $("#zoomLevelInput");
		$zoomLevelInput.val(zoomLevel);
		$zoomLevelInput.change(function(e){

			var val = $(this).val();
			var zoom_level = parseInt(val);
			if (zoom_level >= 100){
				zoomLevel = zoom_level;
				localStorage["zoom_level"] = zoom_level;
				$lever.css("left", zoomLevel - 100);
			}
			else
				$zoomLevelInput.val(zoomLevel);
		});

		// zoom level slider
		var $lever = $('.lever');
		var $dragging = null;
		var $slide = $('.slide');
		var slideLeft = $slide.offset().left;
		var slideRight = slideLeft + $slide.outerWidth();

		$lever.mousedown(function(e) {
			e.originalEvent.preventDefault();
			$dragging = $(e.target);
		}).mouseup(function(e) {
			e.originalEvent.preventDefault();
			$dragging = null;
		}).css("left", zoomLevel - 100);

		$slide.mousemove(
			function(e) {
				if ($dragging) {
					var left = e.pageX - slideLeft;

					if (slideLeft < e.pageX	&& slideRight > e.pageX) {

						$dragging.css("left" , left);
						var zoom_level = 100 + parseInt(left);
						$zoomLevelInput.val(zoom_level);
						localStorage["zoom_level"] = zoom_level;
						zoomLevel = zoom_level;
					}
				}
			});

		//close button
		$(".close").click(function(e) {
			e.preventDefault();
			window.close();
		});
	};

	return {
		init : function() {
			$(document.body).mousemove(onMouseMove);
		},

		popup : function() {

			var zoom_level = parseInt(localStorage["zoom_level"]);

			zoomLevel = (!isNaN(zoom_level)) ? zoom_level : 100;
			console.log(zoomLevel);
			setupPopup();
		}
	}
}();


if (window.location.href == "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/popup.html") {
	$(document).ready(function() {
		zoomer.popup();
	});
}
else {
	$(document).ready(function() {
            zoomer.init();
	});
}
