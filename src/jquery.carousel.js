/* jQuery Carousel 0.9.5
   Copyright 2008-2009 Thomas Lanciaux and Pierre Bertet.
   This software is licensed under the CC-GNU LGPL <http://creativecommons.org/licenses/LGPL/2.1/>
*/
;(function($){
	
	$.fn.carousel = function(params){
		
		var params = $.extend({
			direction: "horizontal",
			loop: false,
			dispItems: 1,
			pagination: false,
			paginationPosition: "inside",
			nextBtn: '<a role="button">Next</a>',
			prevBtn: '<a role="button">Previous</a>',
			btnsPosition: "inside",
			nextBtnInsert: "appendTo",
			prevBtnInsert: "prependTo",
			nextBtnInsertFn: false,
			prevBtnInsertFn: false,
			autoSlide: false,
			autoSlideInterval: 3000,
			delayAutoSlide: false,
			combinedClasses: false,
			effect: "slide",
			slideEasing: "swing",
			animSpeed: "normal",
			equalWidths: "true",
			verticalMargin: 0,
			callback: function () {}, 
			useAddress: false,
			adressIdentifier: "carousel",
			tabLabel: function (tabNum) { return tabNum; },
			showEmptyItems: true
		}, params);
		
		// Buttons position
		if (params.btnsPosition == "outside"){
			params.prevBtnInsert = "insertBefore";
			params.nextBtnInsert = "insertAfter";
		}
		
		// Slide delay
		params.delayAutoSlide = params.delayAutoSlide || params.autoSlideInterval;
		
		return this.each(function(){
			
			// Env object
			var env = {
				$elts: {},
				params: params,
				launchOnLoad: []
			};
			
			// Carousel main container
			env.$elts.carousel = $(this).addClass("js");
			
			// Carousel content
			env.$elts.content = $(this).children().css({position: "absolute", "top": 0});
			
			// Content wrapper
			env.$elts.wrap = env.$elts.content.wrap('<div class="carousel-wrap"></div>').parent().css({overflow: "hidden", position: "relative"});
			
			// env.steps object
			env.steps = {
				first: 0, // First step
				count: env.$elts.content.children().length // Items count
			};
			
			// Last visible step
			env.steps.last = env.steps.count - 1;
			
			// Prev Button
			if ($.isFunction(env.params.prevBtnInsertFn)) {
				env.$elts.prevBtn = env.params.prevBtnInsertFn(env.$elts);
				
			} else { 
				env.$elts.prevBtn = $(params.prevBtn)[params.prevBtnInsert](env.$elts.carousel);
			}
			
			// Next Button
			if ($.isFunction(env.params.nextBtnInsertFn)) {
				env.$elts.nextBtn = env.params.nextBtnInsertFn(env.$elts);
				
			} else {
				env.$elts.nextBtn = $(params.nextBtn)[params.nextBtnInsert](env.$elts.carousel);
			}
			
			// Add buttons classes / data
			env.$elts.nextBtn.addClass("carousel-control next carousel-next");
			env.$elts.prevBtn.addClass("carousel-control previous carousel-previous");
			
			// Bind events on next / prev buttons
			initButtonsEvents(env);
			
			// Pagination
			if (env.params.pagination) {
				initPagination(env);
			}
			
			// Address plugin
			initAddress(env);
			
			// On document load...
			$(function(){
				
				//Set max Height with the highest element
				var $items = env.$elts.content.children();
				var $maxHeight = 0;
				
				$items.each(function () {
					$item = $(this);
					$itemHeight = $item.outerHeight();
					if ($itemHeight > $maxHeight) {
						$maxHeight = $itemHeight;
					}
				});
				if (env.params.verticalMargin > 0) {
					$maxHeight = $maxHeight + env.params.verticalMargin;
				}
				
				$items.height($maxHeight);
				// First item
				var $firstItem = env.$elts.content.children(":first");
				
				// Width 1/1 : Get default item width
				env.itemWidth = $firstItem.outerWidth();
				
				// Width 2/3 : Define content width
				if (params.direction == "vertical"){
					env.contentWidth = env.itemWidth;
					
				} else {
					
					if (params.equalWidths) {
						env.contentWidth = env.itemWidth * env.steps.count;
						
					} else {
						env.contentWidth = (function(){
								var totalWidth = 0;
								
								env.$elts.content.children().each(function(){
									totalWidth += $(this).outerWidth();
								});
								
								return totalWidth;
							})();
					}
				}
				
				// Width 3/3 : Set content width to container
				env.$elts.content.width(env.contentWidth);
				
				// Height 1/2 : Get default item height
				env.itemHeight = $maxHeight;
				
				// Height 2/2 : Set content height to container
				if (params.direction == "vertical") {
					env.$elts.content.css({
						height: env.itemHeight * env.steps.count + "px"
					});
					env.$elts.content.parent().css({
						height: env.itemHeight * env.params.dispItems + "px"
					});
				} else {
					env.$elts.content.parent().css({
						height: env.itemHeight + "px"
					});
				}
				
				// Update Next / Prev buttons state
				updateButtonsState(env);
				
				// Launch function added to "document ready" event
				$.each(env.launchOnLoad, function(i,fn){
					fn();
				});
				
				// Launch autoslide
				if (env.params.autoSlide){
					window.setTimeout(function(){
						env.autoSlideInterval = window.setInterval(function(){
							goToStep( env, getRelativeStep(env, "next") );
						}, env.params.autoSlideInterval);
					}, env.params.delayAutoSlide);
				}
				
			});
			
		});
		
	};
	
	// Next / Prev buttons events only
	function initButtonsEvents(env){
		
		env.$elts.nextBtn.add(env.$elts.prevBtn)
			
			.bind("enable", function(){
				
				var $this = $(this)
					.unbind("click")
					.bind("click", function(){
						goToStep( env, getRelativeStep(env, ($this.is(".next")? "next" : "prev" )) );
						stopAutoSlide(env);
					})
					.removeClass("disabled");
				
				// Combined classes (IE6 compatibility)
				if (env.params.combinedClasses) {
					$this.removeClass("next-disabled previous-disabled");
				}
			})
			.bind("disable", function(){
				
				var $this = $(this).unbind("click").addClass("disabled");
				
				// Combined classes (IE6 compatibility)
				if (env.params.combinedClasses) {
					
					if ($this.is(".next")) {
						$this.addClass("next-disabled");
						
					} else if ($this.is(".previous")) {
						$this.addClass("previous-disabled");
						
					}
				}
			})
			.hover(function(){
				$(this).toggleClass("hover");
			});
	};
	
	// Pagination
	function initPagination(env) {
			env.$elts.pagination = $('<div class="center-wrap"><div class="carousel-pagination"><p></p></div></div>')[((env.params.paginationPosition == "outside") ? "insertAfter" : "appendTo")](env.$elts.carousel).find("p");
			env.$elts.paginationBtns = $([]);
			env.$elts.content.find("li").each(function (i) {
				if (i % env.params.dispItems == 0) {
					env.$elts.paginationBtns = env.$elts.paginationBtns.add($('<a role="button"><span>' + env.params.tabLabel(env.$elts.paginationBtns.length + 1) + '</span></a>').data("firstStep", i));
				}
			});
			env.$elts.paginationBtns.each(function () { $(this).appendTo(env.$elts.pagination); });
			env.$elts.paginationBtns.slice(0, 1).addClass("active");
			env.launchOnLoad.push(function () {
				env.$elts.paginationBtns.click(function (e) {
					goToStep(env, $(this).data("firstStep"));
					stopAutoSlide(env);
				});
			});
    };
	
	// Address plugin
	function initAddress(env) {
		
		if (env.params.useAddress && $.isFunction($.fn.address)) {
			
			$.address
				.init(function(e) {
					var pathNames = $.address.pathNames();
					if (pathNames[0] === env.params.adressIdentifier && !!pathNames[1]) {
						goToStep(env, pathNames[1]-1);
					} else {
						$.address.value('/'+ env.params.adressIdentifier +'/1');
					}
				})
				.change(function(e) {
					var pathNames = $.address.pathNames();
					if (pathNames[0] === env.params.adressIdentifier && !!pathNames[1]) {
						goToStep(env, pathNames[1]-1);
					}
				});
		} else {
			env.params.useAddress = false;
		}
	};
	
	function goToStep(env, step) {
		
		// Callback
		env.params.callback(step);
		
		// Launch animation
		transition(env, step);
		
		// Update first step
		env.steps.first = step;
		
		// Update buttons status
		updateButtonsState(env);
		
		// Update address (jQuery Address plugin)
		if ( env.params.useAddress ) {
			$.address.value('/'+ env.params.adressIdentifier +'/' + (step + 1));
		}
		
	};
	
	// Get next/prev step, useful for autoSlide
	function getRelativeStep(env, position) {
		if (position == "prev") {
			if (!env.params.showEmptyItems) {
				if (env.steps.first == 0) {
					return ((env.params.loop) ? (env.steps.count - env.params.dispItems) : false);
				} else {
					return Math.max(0, env.steps.first - env.params.dispItems);
				}
			} else {
				if ((env.steps.first - env.params.dispItems) >= 0) {
					return env.steps.first - env.params.dispItems;
				} else {
					return ((env.params.loop) ? (env.steps.count - env.params.dispItems) : false);
				}
			}
		} else if (position == "next") {
			if ((env.steps.first + env.params.dispItems) < env.steps.count) {
				if (!env.params.showEmptyItems) {
					return Math.min(env.steps.first + env.params.dispItems, env.steps.count - env.params.dispItems);
				} else {
					return env.steps.first + env.params.dispItems;
				}
			} else {
				return ((env.params.loop) ? 0 : false);
			}
		}
	};
	
	// Animation
	function transition(env, step) {
		
		// Effect
		switch (env.params.effect){
			
			// No effect
			case "no":
				if (env.params.direction == "vertical"){
					env.$elts.content.css("top", -(env.itemHeight * step) + "px");
				} else {
					env.$elts.content.css("left", -(env.itemWidth * step) + "px");
				}
				break;
			
			// Fade effect
			case "fade":
				if (env.params.direction == "vertical"){
					env.$elts.content.hide().css("top", -(env.itemHeight * step) + "px").fadeIn(env.params.animSpeed);
				} else {
					env.$elts.content.hide().css("left", -(env.itemWidth * step) + "px").fadeIn(env.params.animSpeed);
				}
				break;
			
			// Slide effect
			default:
				if (env.params.direction == "vertical"){
					env.$elts.content.stop().animate({
						top : -(env.itemHeight * step) + "px"
					}, env.params.animSpeed, env.params.slideEasing);
				} else {
					env.$elts.content.stop().animate({
						left : -(env.itemWidth * step) + "px"
					}, env.params.animSpeed, env.params.slideEasing);
				}
				break;
		}
		
	};
	
	// Update all buttons state : disabled or not
	function updateButtonsState(env){
		
		if (getRelativeStep(env, "prev") !== false) {
			env.$elts.prevBtn.trigger("enable");
			
		} else {
			env.$elts.prevBtn.trigger("disable");
		}
		
		if (getRelativeStep(env, "next") !== false) {
			env.$elts.nextBtn.trigger("enable");
			
		} else {
			env.$elts.nextBtn.trigger("disable");
		}
		
		if (env.params.pagination){
			env.$elts.paginationBtns.removeClass("active")
			.filter(function(){ return ($(this).data("firstStep") == env.steps.first) }).addClass("active");
		}
	};
	
	// Stop autoslide
	function stopAutoSlide(env) {
		if (!!env.autoSlideInterval){
			window.clearInterval(env.autoSlideInterval);
		}
	};
	
})(jQuery);