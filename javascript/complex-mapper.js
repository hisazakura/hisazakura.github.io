var pageState = "running";

var interestPoint = {
	re: undefined,
	im: undefined,
};
var mapCache = {
	needUpdate: true,
	inputMap: undefined,
	outputMap: undefined,
};

var displayOutputGuide = false;

var complexFunction = (a, b, expression) => {
	// Replace 'z' with 'a + b*i' in the expression
	const parsedExpression = expression.replace(/z/g, `(${a} + ${b}*i)`);
	const result = math.evaluate(parsedExpression);

	return result;
};

var drawInputGrid = () => {
	const domain = {
		re: [parseFloat($("#x-min-input").val()), parseFloat($("#x-max-input").val())],
		im: [parseFloat($("#y-min-input").val()), parseFloat($("#y-max-input").val())],
	};

	const inputMap = {
		element: $("#input-map")[0],
		context: $("#input-map")[0].getContext("2d"),
	};

	inputMap.element.width = $("#input-map").parent().width();
	inputMap.element.height = $("#input-map").parent().height();

	inputMap.context.clearRect(0, 0, inputMap.element.width, inputMap.element.height);

	if (mapCache.needUpdate) {
		if (domain.re[0] > domain.re[1]) [domain.re[0], domain.re[1]] = [domain.re[1], domain.re[0]];
		if (domain.im[0] > domain.im[1]) [domain.im[0], domain.im[1]] = [domain.im[1], domain.im[0]];

		inputMap.context.font = "12px Arial";
		inputMap.context.textBaseline = "top";
		inputMap.context.textAlign = "left";
		inputMap.context.fillStyle = "white";

		// x (vertical lines)
		const realInterval = domain.re[1] - domain.re[0];
		inputMap.context.strokeStyle = `rgba(13, 110, 253, 1)`;
		for (let re = Math.round(domain.re[0]); re < domain.re[1]; re++) {
			inputMap.context.beginPath();
			inputMap.context.moveTo((inputMap.element.width * (re - domain.re[0])) / realInterval, 0);
			inputMap.context.lineTo((inputMap.element.width * (re - domain.re[0])) / realInterval, inputMap.element.height);
			inputMap.context.stroke();
			if (re > domain.re[0] && re < domain.re[1])
				inputMap.context.fillText(re, (inputMap.element.width * (re - domain.re[0])) / realInterval, 0);
		}

		// y (horizontal lines)
		const imaginaryInterval = domain.im[1] - domain.im[0];
		inputMap.context.strokeStyle = `rgba(220, 53, 69, 1)`;
		for (let im = Math.round(domain.im[0]); im < domain.im[1]; im++) {
			inputMap.context.beginPath();
			inputMap.context.moveTo(0, inputMap.element.height * (1 - (im - domain.im[0]) / imaginaryInterval));
			inputMap.context.lineTo(
				inputMap.element.width,
				inputMap.element.height * (1 - (im - domain.im[0]) / imaginaryInterval)
			);
			inputMap.context.stroke();
			if (im > domain.im[0] && im < domain.im[1])
				inputMap.context.fillText(im, 0, inputMap.element.height * (1 - (im - domain.im[0]) / imaginaryInterval));
		}

		// cache map
		mapCache.inputMap = inputMap.context.getImageData(0, 0, inputMap.element.width, inputMap.element.height);
	} else inputMap.context.putImageData(mapCache.inputMap, 0, 0);

	if (interestPoint.re !== undefined && interestPoint.im !== undefined) {
		inputMap.context.strokeStyle = "white";
		inputMap.context.beginPath();
		inputMap.context.arc(
			(inputMap.element.width * (interestPoint.re - domain.re[0])) / (domain.re[1] - domain.re[0]),
			inputMap.element.height * (1 - (interestPoint.im - domain.im[0]) / (domain.im[1] - domain.im[0])),
			Math.round(inputMap.element.width / 50),
			0,
			2 * Math.PI
		);
		inputMap.context.stroke();
	}
};

var drawOutputGrid = () => {
	const domain = {
		re: [parseFloat($("#x-min-input").val()), parseFloat($("#x-max-input").val())],
		im: [parseFloat($("#y-min-input").val()), parseFloat($("#y-max-input").val())],
	};

	const outputMap = {
		element: $("#output-map")[0],
		context: $("#output-map")[0].getContext("2d"),
	};
	outputMap.element.width = $("#output-map").parent().width();
	outputMap.element.height = $("#output-map").parent().height();

	outputMap.context.clearRect(0, 0, outputMap.element.width, outputMap.element.height);

	// display output guide
	if (displayOutputGuide && mapCache.inputMap instanceof ImageData) {
		// grayscale
		const inputMapData = structuredClone(mapCache.inputMap);
		const data = inputMapData.data;
		for (let i = 0; i < data.length; i += 4) {
			// 1 red + 7 blue increases brightness for blue color
			// and multiply by 70% to reduce overall brightness
			const average = ((data[i] + data[i + 2] * 7) / 8) * 0.7;
			data[i] = average; // Red
			data[i + 1] = average; // Green
			data[i + 2] = average; // Blue
		}
		outputMap.context.putImageData(inputMapData, 0, 0);
	}

	const f = $("#function-input").val();
	// updates output graph
	if (mapCache.needUpdate) {
		// prevent broken domain
		if (domain.re[0] > domain.re[1]) [domain.re[0], domain.re[1]] = [domain.re[1], domain.re[0]];

		// draw x axis
		for (let re = Math.round(domain.re[0]); re <= domain.re[1]; re++) {
			// let result = [];rgba(220, 53, 69, 1)
			outputMap.context.strokeStyle = "rgba(220, 53, 69, 1)";
			outputMap.context.beginPath();

			let result = complexFunction(domain.re[0], re, f);
			outputMap.context.moveTo(
				(outputMap.element.width * (result.re - domain.re[0])) / (domain.re[1] - domain.re[0]),
				outputMap.element.height * (1 - (result.im - domain.im[0]) / (domain.im[1] - domain.im[0]))
			);
			for (let i = 1; i <= 100; i++) {
				result = complexFunction(domain.re[0] + (i * (domain.re[1] - domain.re[0])) / 100, re, f);
				const mapped = [
					(outputMap.element.width * (result.re - domain.re[0])) / (domain.re[1] - domain.re[0]),
					outputMap.element.height * (1 - (result.im - domain.im[0]) / (domain.im[1] - domain.im[0])),
				];
				// dont connect if number is inf
				if (!isFinite(result.re)) mapped[0] = Math.sign(result.re) * 10000;
				if (!isFinite(result.im)) mapped[1] = Math.sign(result.im) * 10000;
				if (!isFinite(result.re) || !isFinite(result.im)) outputMap.context.moveTo(mapped[0], mapped[1]);
				else outputMap.context.lineTo(mapped[0], mapped[1]);
			}
			outputMap.context.stroke();
		}

		// draw y axis
		for (let im = Math.round(domain.im[0]); im <= domain.im[1]; im++) {
			outputMap.context.strokeStyle = "rgba(13, 110, 253, 1)";
			outputMap.context.beginPath();

			let result = complexFunction(im, domain.im[0], f);
			outputMap.context.moveTo(
				(outputMap.element.width * (result.re - domain.re[0])) / (domain.re[1] - domain.re[0]),
				outputMap.element.height * (1 - (result.im - domain.im[0]) / (domain.im[1] - domain.im[0]))
			);

			for (let i = 0; i < 101; i++) {
				result = complexFunction(im, domain.im[0] + (i * (domain.im[1] - domain.im[0])) / 100, f);
				const mapped = [
					(outputMap.element.width * (result.re - domain.re[0])) / (domain.re[1] - domain.re[0]),
					outputMap.element.height * (1 - (result.im - domain.im[0]) / (domain.im[1] - domain.im[0])),
				];
				// dont connect if number is inf
				if (!isFinite(result.re)) mapped[0] = Math.sign(result.re) * 10000;
				if (!isFinite(result.im)) mapped[1] = Math.sign(result.im) * 10000;
				if (!isFinite(result.re) || !isFinite(result.im)) outputMap.context.moveTo(mapped[0], mapped[1]);
				else outputMap.context.lineTo(mapped[0], mapped[1]);
			}
			outputMap.context.stroke();
		}
		mapCache.outputMap = outputMap.context.getImageData(0, 0, outputMap.element.width, outputMap.element.height);
	} else outputMap.context.putImageData(mapCache.outputMap, 0, 0);

	if (interestPoint.re !== undefined && interestPoint.im !== undefined) {
		const mappedInterest = complexFunction(interestPoint.re, interestPoint.im, f);
		outputMap.context.strokeStyle = "white";
		outputMap.context.beginPath();
		outputMap.context.arc(
			(outputMap.element.width * (mappedInterest.re - domain.re[0])) / (domain.re[1] - domain.re[0]),
			outputMap.element.height * (1 - (mappedInterest.im - domain.im[0]) / (domain.im[1] - domain.im[0])),
			Math.round(outputMap.element.width / 50),
			0,
			2 * Math.PI
		);
		outputMap.context.stroke();
	}
};

var draw = () => {
	drawInputGrid();
	drawOutputGrid();
	mapCache.needUpdate = false;
};

function waitUntil(conditionFn, callback) {
	if (!conditionFn()) return setTimeout(() => waitUntil(conditionFn, callback), 100);
	else callback();
}

$("#app-content").hide();

setTimeout(() => {
	if ($("#loading-spinner").is(":visible")) $("#reload-page").removeClass("d-none");
}, 5000);

if (!$("#input-map")[0].getContext("2d", { willReadFrequently: true })) {
	$("#loading-spinner").fadeOut(200);
	$("#canvas-not-supported").removeClass("d-none");
	pageState = "noCanvas";
}

if (pageState === "running") {
	$("#output-map")[0].getContext("2d", { willReadFrequently: true });

	// draw grid after math.js is loaded
	waitUntil(() => { return $('script[src*="math.js"]').length > 0 }, () => {
		$("#loading-spinner").fadeOut(200);
		$("#app-content").fadeIn(1000);
		draw();
	});

	$("#input-map").on("mousemove", (event) => {
		const rect = $("#input-map")[0].getBoundingClientRect();
		const mouse = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		const domain = {
			re: [parseFloat($("#x-min-input").val()), parseFloat($("#x-max-input").val())],
			im: [parseFloat($("#y-min-input").val()), parseFloat($("#y-max-input").val())],
		};
		interestPoint = {
			re: (mouse.x * (domain.re[1] - domain.re[0])) / (rect.right - rect.left) + domain.re[0],
			im: (mouse.y * (domain.im[1] - domain.im[0])) / (rect.top - rect.bottom) - domain.im[0],
		};

		drawInputGrid();
		drawOutputGrid();
	});
	$("#input-map").on("mouseleave", () => {
		interestPoint = {
			re: undefined,
			im: undefined,
		};
		drawInputGrid();
		drawOutputGrid();
	});

	$("#map-function").on("click", () => {
		mapCache.needUpdate = true;
		draw();
	});
	$("#output-map").on("click touchend", () => {
		displayOutputGuide = !displayOutputGuide;
		mapCache.needUpdate = true;
		draw();
	});
}
