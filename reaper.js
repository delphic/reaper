var util = require('util');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var sourceUrls = { 
	GpuGems: "http://http.developer.nvidia.com/GPUGems/gpugems_part01.html", 
	GpuGems2: "http://http.developer.nvidia.com/GPUGems2/gpugems2_part01.html", 
	GpuGems3: "http://http.developer.nvidia.com/GPUGems3/gpugems3_ch01.html" 
};

request(sourceUrls.GpuGems, function(error, response, body){
	if (error) {
		throw error;
	}
	$ = cheerio.load(body);
	
	var allPages = [];
	$("#right a").each(function(){
		allPages.push({
			url: $(this).attr("href"),
			title: $(this).html()	// TODO: Retrieve inner most title (as current page has extra tags)
		});
	});

	var root = "http://http.developer.nvidia.com/GPUGems/"; // Need to key this on book globally and the output directory (currently hardcoded as "GPUGems/")
	// TODO: Create Output directory if required
	for(var i = 0, l = allPages.length; i < l; i++) {
		request(root + allPages[i].url, function(root, title, path) { 
			return function(error, response, body) {
				util.log("Reaping " + path);
				$ = cheerio.load(body);

				var html = "<html><head><title>" + title + "</title></head><body>";
				// TODO: Include <nav> with allPages info
				html += $("#center").html();
				html += "</body></html>";

				$("#center img").each(function(){
					var filePath = $(this).attr("src"); 
					// TODO: proper path parsing - create necessary directories - currently just added "elementLinks/" manually
					request(root + filePath).pipe(fs.createWriteStream("GPUGems/"+filePath));
				});

				fs.writeFile("GPUGems/" + path, html, function(path) { 
					return function(error) {
						if(error) {
							util.log("Error writing file " + path);
						} else {
							util.log("Wrote file " + path);
						}
					}
				}(path)); 
			}; 
		}(root, allPages[i].title, allPages[i].url));
	}
});

// TODO: Retrieve GPUGems2 and GPUGems3