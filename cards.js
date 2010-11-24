//<![CDATA[
//*****************************************************************************
// Do not remove this notice.
//
// Copyright 2001 by Mike Hall.
// See http://www.brainjar.com for terms of use.                                                                        *
//*****************************************************************************
 
var minSize = 8;
function resizeCards(d) {
  var n;
  // Change the font size on the "card" style class.
  // DOM-compliant browsers.
  if (document.styleSheets[0].cssRules) {
    n = parseInt(document.styleSheets[0].cssRules[0].style.fontSize, 10);
    document.styleSheets[0].cssRules[0].style.fontSize = Math.max(n + d, minSize) + "pt";
    // For NS 6.1, insert a dummy rule to force styles to be reapplied.
    if (navigator.userAgent.indexOf("Netscape6/6.1") >= 0)
      document.styleSheets[0].insertRule(null, document.styleSheets[0].cssRules.length);
  }
  // IE browsers.
  else if (document.styleSheets[0].rules[0]) {
    n = parseInt(document.styleSheets[0].rules[0].style.fontSize, 10);
    document.styleSheets[0].rules[0].style.fontSize = Math.max(n + d, minSize) + "pt";
  }
  return false;
}

draw_card = function(c, x, y) {
	if (x == null) { x = 0 }
	if (y == null) { y = 0 }
	dot_map = {
		"10": ["A1", "A2", "A4", "A5", "B2", "B4", "C1", "C2", "C4", "C5"],
		"9": ["A1", "A2", "A4", "A5", "B3", "C1", "C2", "C4", "C5"],
		"8": ["A1", "A3", "A5", "B2", "B4", "C1", "C3", "C5"],
		"7": ["A1", "A3", "A5", "B2", "C1", "C3", "C5"],
		"6": ["A1", "A3", "A5", "C1", "C3", "C5"],
		"5": ["A1", "A5", "B3", "C1", "C5"],
		"4": ["A1", "A5", "C1", "C5"],
		"3": ["B1", "B3", "B5"],
		"2": ["B1", "B5"],
		"A": ["ace"],
		"K": ["A1", "C5"],
		"Q": ["A1", "C5"],
		"J": ["A1", "C5"]
	}
	suit_names = {"d": "&diams;", "h": "&hearts;", "s": "&spades;", "c": "&clubs;"}
	$card = $("#card_template").clone();
	suit = c.split("")[1]
	rank = c.split("")[0]
	suit = (suit == "0" ? c.split("")[2] : suit)
	rank = (rank == "1" ? "10" : rank)
	$card.find(".index").html(rank + "<br />" + suit_names[suit])
	dots = dot_map[rank]
	for (i=0; i<=(dots.length - 1); i++) {
		dot = dots[i]
		$dot = $card.find(".spot").clone();
		$dot.attr("class", "spot" + dot);
		$dot.html(suit_names[suit]);
		$dot.appendTo($card.find(".front"));
	}
	$card.find(".spot").remove();
	$card.attr("id", c);
	$card.attr("style", "left:" + x + "em;top:" + y + "em")
	if (suit == "h" || suit == "d") {
		$card.find(".front").addClass("red")
	}
	if (rank == "K") {
		$card.find(".face").attr("src", "/images/king.gif")
	} else if (rank == "Q") {
		$card.find(".face").attr("src", "/images/queen.gif")
	} else if (rank == "J") {
		$card.find(".face").attr("src", "/images/jack.gif")
	} else {
		$card.find(".face").remove();
	}
	if (rank == "A") {
		$card.find(".ace").html(suit_names[suit]);
		$card.find(".spotace").remove();
	} else {
		$card.find(".ace").remove();
	}
	$card.appendTo($("#table"))
	$(".card").draggable();
	return null;
}

draw_hand = function(hand) {
	for (i in hand) {
		draw_card(hand[i], i);
	}
};

$(document).ready(function() {
	
	var max_z = 0;
	$(".card").live("mouseover", function(ev) {
		max_z += 1
		$(this).zIndex(max_z);
	})
	$(".card").live("mouseout", function(ev) {
		//$(this).zIndex();
	})
})
