var selected = "";

function select(id) {
	$("#selector-menu li a").each(function (idx, a) {
		// deactivate previously selected
		if (a.innerText == selected) $(a).removeClass("active");

		// activate the new selection
		if (a.innerText == id) $(a).addClass("active");
	});
	// hide previously selected
	$("#" + selected).addClass("d-none");
	// show new selection
	$("#" + id).removeClass("d-none");

	// change selection text
	$("#selector").text(id.replace("\\/", "/"));
	selected = id;
}

$("#selector-menu li a").each(function (idx, a) {
	if ($(a).hasClass("dropdown-item")) {
		selected = $(this).text();
		select(a.innerText);
		return false;
	}
});

$("#selector-menu")
	.find("a")
	.on("click", function (event) {
		event.preventDefault();
		select($(this).text().replace("/", "\\/"));
	});
