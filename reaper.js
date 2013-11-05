var util = require('util');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var deleteFolderRecursive = function(path) {
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			var curPath = path + "/" + file;
			if (fs.statSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};
 
// Uncomment as required, cba to figure out why it errors if you do all at once
var sources = { 
	GPUGems: { root: "http://http.developer.nvidia.com/GPUGems/", start: "gpugems_part01.html" }, 
	//GPUGems2: { root: "http://http.developer.nvidia.com/GPUGems2/", start: "gpugems2_part01.html" }, 
	//GPUGems3: { root: "http://http.developer.nvidia.com/GPUGems3/", start: "gpugems3_part01.html" } 
};

for(var key in sources) {
	if(!sources.hasOwnProperty(key)) { continue; }

	deleteFolderRecursive(key); // Clear Existing  
	fs.mkdirSync(key);
	fs.mkdirSync(key+"/elementLinks"); // TODO: Detect this when retrieving images instead of knowing
	fs.writeFile(key+"/styles.css", [ "body { font-family: sans-serif; } ",
		"nav ul, nav li { list-style: none; margin: 0; padding: 0; }",
		"code, pre { font-family: monospace; background-color: #EEEEEE; }",
		"@media print {",
		"nav { display: none; }",
		"}"].join('\n'));

	request(sources[key].root + sources[key].start, function(root, outputDir) { 
		return function(error, response, body){
			if (error) { throw error; }

			util.log("Reaping "+root);

			$ = cheerio.load(body);
			
			var allPages = [];
			$("#right a").each(function(){
				var url = $(this).attr("href");
				var title = $(this).children("i").children("font").children("b").children("i").html() 
					? $(this).children("i").children("font").children("b").children("i").html() 
					: $(this).children("i").html() 
						? $(this).children("i").html() 
						: $(this).html();
				allPages.push({ url: url, title: title });
			});

			var nav = [ "<nav>", "<ul>"];
			for(var i = 0, l = allPages.length; i < l; i++) {
				nav.push("<li><a href=\"" + allPages[i].url + "\">" + allPages[i].title + "</a></li>");
			}
			nav.push("</ul>");
			nav.push("</nav>");

			for(var i = 0, l = allPages.length; i < l; i++) {
				request(root + allPages[i].url, function(root, title, path, nav) { 
					return function(error, response, body) {
						$ = cheerio.load(body);

						$("#center").remove("script");
						var content = $("#center").html();	

						html = [ "<!DOCTYPE html>",
							"<html>",
							"<head>",
							"<meta charset=\"utf-8\"/>",
							"<title>" + title + "</title>",
							"<link rel=\"stylesheet\" href=\"styles.css\" type=\"text/css\">",
							"</head>",
							"<body>",
							"<!-- Reaped from " + root + path + " -->",
							content.substring(
								content.indexOf("<hr>")+4,
								content.indexOf("<!-- generated html end")),
							nav,
							"</body>",
							"</html>" ].join('\n');

						$("#center img").each(function(){
							var filePath = $(this).attr("src"); 
							request(root + filePath).pipe(fs.createWriteStream(outputDir + "/" + filePath));
						});
						fs.writeFile(outputDir + "/" + path, html); 
					}; 
				}(root, allPages[i].title, allPages[i].url, nav.join('\n')));
			}
		};
	}(sources[key].root, key));
}
