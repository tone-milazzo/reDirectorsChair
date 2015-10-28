var RDC;

window.onload = function start(){
	RDC = new ReDirectCheck();
	RDC.drawTable();
	RDC.OpenStorage();

	//  Add listeners
	$("input#toCell").keyup(function (e) {
	    if (e.keyCode == 13) {
	        RDC.EnteredToCell();
	    }
	});

	$("textarea#fromCell").keyup(function (e) {
	    if (e.keyCode == 13) {
	        RDC.EnteredFromCell();
	    }
	});

	$("a#checktab").click(function(){
		RDC.closeHelp();
	});

	$("a#reporttab").click(function(){
		RDC.report();
	});

	$("a#csvtab").click(function(){
		RDC.csv();
	});

	$("a#gentab").click(function(){
		RDC.generate();
	});

	$("button#sortbutton").click(function(){
		RDC.sortTable();
	});

	$("button#copydomain").click(function(){
		RDC.copyDomain();
	});

	$("button#copyto").click(function(){
		RDC.copyTo();
	});

	$("button#switchDomains").click(function(){
		RDC.switchDomains();
	});

	$("button#helpbutton").click(function(){
		RDC.toggleHelp();
	});

	$("button#clearbutton").click(function(){
		RDC.ClearStorage();
	});

	$("input#fromDomain").blur(function(){
		RDC.checkDomain('fromDomain');
		RDC.PutInStorage();
	});

	$("input#fromDomain").change(function(){
		RDC.checkDomain('fromDomain');
		RDC.PutInStorage();
	});

	$("button#fromreloadbutton").click(function(){
		RDC.checkFroms();
	});

	$("input#toDomain").blur(function(){
		RDC.PopulateSiteMapList();
		RDC.PutInStorage();
	});

	$("input#toDomain").change(function(){
		RDC.checkDomain('toDomain');
		RDC.PutInStorage();
	});

	$("button#toreloadbutton").click(function(){
		RDC.checkTos();
	});

	$("textarea#fromCell").on("paste", function(){
		setTimeout(function(){RDC.FromCellChanged();}, 5);
	});

	// if urls loaded from storage, check them
	RDC.checkDomain('fromDomain');
	RDC.checkDomain('toDomain');
	RDC.PopulateSiteMapList();
}

// function RDCLine(from, to){
// 	if(to == "") to = "/";
// 	this.from = from;
// 	this.to = to;
// 	this.deleted = false;
// }

function RDCLine(from, to, repeat){
	this.deleted = false;
	if(to == "") to = "/";
	if(repeat != true && repeat != false) repeat = false;
	this.from = from;
	this.to = to;
	this.deleted = repeat;
	this.fromCode = undefined;
	this.toCode = undefined;
	//console.log(this.deleted);
}

function ReDirectCheck(){
	this.lines = new Array(); // line data
	this.fromURLS = new Array(); // for the datalist
	this.toURLS = new Array(); // for the datalist
	this.helpOpen = false;
	this.toSiteMap = new Array(); // to check if the new rules are substrings of current urls
	this.codeDef = {"null":"Server Not Found","100":"Continue","101":"Switching Protocols","200":"OK. The request has succeeded.","201":"Created","202":"Accepted","203":"Non-Authoritative Information","204":"No Content","205":"Reset Content","206":"Partial Content","300":"Multiple Choices","301":"Moved Permanently Path: ","302":"Found","303":"See Other","304":"Not Modified","305":"Use Proxy","306":"(Unused)","307":"Temporary Redirect","400":"Bad Request","401":"Unauthorized","402":"Payment Required","403":"Forbidden","404":"Not Found. The server has not found anything matching the Request-URI.","405":"Method Not Allowed","406":"Not Acceptable","407":"Proxy Authentication Required","408":"Request Timeout","409":"Conflict","410":"Gone","411":"Length Required","412":"Precondition Failed","413":"Request Entity Too Large","414":"Request-URI Too Long","415":"Unsupported Media Type","416":"Requested Range Not Satisfiable","417":"Expectation Failed","500":"Internal Server Error","501":"Not Implemented","502":"Bad Gateway","503":"Service Unavailable","504":"Gateway Timeout","505":"HTTP Version Not Supported","default":"(unknown code)"};
	//for toggling to dev link
	this.fromLiveURL = "";
	this.toLiveURL = "";
	//for toggling group delete
	this.deleteStart = null;
}

ReDirectCheck.prototype.FromCellChanged = function(){
	var FCValue = $("#fromCell").val().toString();
	//console.log("here " + FCValue);
	var FCLines;
	var URLs = new Array();

	FCLines = FCValue.split('\n');
	for( var i =0 ; i< FCLines.length ; ++i){
		FCLines[i] = FCLines[i].split(/[\s,\t\n\r]/); //split tabs, commas or spaces
		this.AddLine(decodeURIComponent(FCLines[i][0]), decodeURIComponent(FCLines[i][1]));
	}
	this.drawTable();
	$("#fromCell").val("");
	this.checkDomain('fromDomain');
	this.PutInStorage();
}

ReDirectCheck.prototype.AddLine = function(from, to){
	var fromURL;
	var toURL;
	var repeat = false;

	//console.log("AddLine");

	// correct blank tos
	if(to == null || to == "undefined"){
		to="/";
	}

	//pull from base url
	if(from.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})\//) != null){
		fromURL = from.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/)[0];
	}else{
		fromURL = "";
	}

	//pull to base url
	if( to.indexOf("cloudfront") > -1) //keep cloudfront urls
		toURL = "";
	else if(to.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})\//) != null){
		toURL = to.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/)[0];
	}else{
		toURL = "";
	}

	// cut base urls
	from = from.replace(fromURL,"");
	to = to.replace(toURL,"");

	// if from and to are the same, skip
	if(from == to)
		return;

	// blog links direct to /blog at a minimum
	if(((from.indexOf("/blog") == 0) && from.length > 5 ) && ((to == "/") || (to == ""))){
		to = "/blog";
	}

	// photogallery links direct to /photogallery at a minimum
	//console.log(from + " " + to);
	if(((from.indexOf("/photogallery") == 0) && from.length > 13 ) && ((to == "/") || (to == ""))){
		to = "/photogallery";
	}

	//If from and to combination already on the list, go ahead and add it but folded up
	//console.log(" to "+ to);
	for( var i = 0; i < this.lines.length; ++i){
		if( this.lines[i].from == from && this.lines[i].to == to){
			repeat = true; //if the path repeats you must delete
			break;
		}
	}

	//add  line to data
	this.lines.push(new RDCLine(from, to, repeat));
	this.PutInStorage();
	this.addURL("from", fromURL);
	this.addURL("to", toURL);
}

ReDirectCheck.prototype.EnteredFromCell = function(){
	$("#fromCell").val($("#fromCell").val().trim()).toString(); //trim whitespace, but mostly the \n at the end
	$("#toCell").focus();
}

ReDirectCheck.prototype.EnteredToCell = function(){
	var from = $("#fromCell").val();
	var to = $("#toCell").val();
	$("#fromCell").val("");
	$("#toCell").val("");

	if (typeof from === "undefined") {
		from = "";
	}
	if (typeof to === "undefined") {
		to = "";
	}
	this.AddLine(from, to);
	this.drawTable();
}

ReDirectCheck.prototype.drawTable = function(){
	var table = document.getElementById("tableBody");
	var tableInnerds = "";

	for(var i = 0; i< this.lines.length; ++i){
		tableInnerds += '<tr title="' + i + '" id="row' + i + '" data-html="true" data-toggle="tooltip" data-placement="left">' +
		'<td class="removeButtonColumn"><span class="glyphicon glyphicon-minus glyphButton delete" onclick="RDC.deleteRow(' + i + ', event);"></span></td>' +
		'<td class="removable"><input name="from" class="form-control from" type="text" value="' + this.lines[i].from + '" onkeyup="RDC.updateFrom(' + i + ', this);" onchange="RDC.updateFrom(' + i + ', this);">' +
		'<span class="glyphicon glyphicon-link glyphButton" onclick="RDC.openInNewPage(' + i + ', \'from\');"></span>' +
		'</td><td id="fromcode' + i + '" class="removable"></td>' +
		'<td class="removable"><input name="to" class="form-control to" type="text" list="sitemapList" value="' + this.lines[i].to + '" onkeyup="RDC.updateTo(' + i + ', this);" onchange="RDC.updateTo(' + i + ', this);">' +
		'<span class="glyphicon glyphicon-link glyphButton" onclick="RDC.openInNewPage(' + i + ', \'to\');"></span>' +
		'</td><td id="tocode' + i + '" class="removable"></td>' +
		'</tr>';
	}

	table.innerHTML = tableInnerds;
	$("#fromCell").focus();
	//loop again to delete rows
	for(var i = 0; i < this.lines.length; ++i){
		//console.log( "loop to delete rows " + i + " = "+this.lines[i].deleted);
		if(this.lines[i].deleted == true)
			this.deleteRow(i);
	}
}


ReDirectCheck.prototype.deleteRow = function(index, event){
	//tone
	if((typeof event !== 'undefined') && event.shiftKey){
		$("#row" + index).addClass("alert-info");
		if(this.deleteStart == null){
			this.deleteStart = index;
		}else if(this.deleteStart == index){
			$("#row" + index).removeClass("alert-info");
			this.deleteStart = null;
		}else{
			if(this.deleteStart < index){
				for( var i = this.deleteStart; i<=index; ++i){
					this.deleteRow(i);
					$("#row" + i).removeClass("alert-info");
				}
				this.deleteStart = null;
			}else if(this.deleteStart > index){
				for( var i = index; i<=this.deleteStart; ++i){
					this.deleteRow(i);
					$("#row" + i).removeClass("alert-info");
				}
				this.deleteStart = null;
			}
		}
	}else{
		//console.log( "delete row " + index);
		this.lines[index].deleted = true;
		$("#row" + index).children("td.removable").css("display","none");
		$("#row" + index).css("height","10px");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon-minus").removeClass("glyphicon-minus").removeClass("delete").addClass("glyphicon-plus");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon-plus").attr("onclick","RDC.restoreRow("+index+",event)");
		//popover
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").attr("data-toggle","popover");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").attr("data-placement","right");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").attr("data-trigger","hover");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").attr("data-content",this.lines[index].from);
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").popover('enable');
		this.PutInStorage();
	}
}

ReDirectCheck.prototype.restoreRow = function(index, event){
	//tone
	if((typeof event !== 'undefined') && event.shiftKey){
		$("#row" + index).addClass("alert-info");
		if(this.deleteStart == null){
			this.deleteStart = index;
		}else{
			if(this.deleteStart < index){
				for( var i = this.deleteStart; i<=index; ++i){
					this.restoreRow(i);
					$("#row" + i).removeClass("alert-info");
				}
				this.deleteStart = null;
			}else{
				for( var i = index; i<=this.deleteStart; ++i){
					this.restoreRow(i);
					$("#row" + i).removeClass("alert-info");
				}
				this.deleteStart = null;
			}
		}
	}else{
		this.lines[index].deleted = false;
		$("#row" + index).children("td.removable").css("display","table-cell");
		$("#row" + index).css("height","51px");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon-plus").addClass("glyphicon-minus").addClass("delete").removeClass("glyphicon-plus");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon-minus").attr("onclick","RDC.deleteRow("+index+",event)");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon-minus").attr("id","");
		//popover
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").removeAttr("data-toggle");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").removeAttr("data-placement");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").removeAttr("data-trigger");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").removeAttr("data-content");
		$("#row" + index).children("td.removeButtonColumn").children("span.glyphicon").popover('disable');
		this.PutInStorage();
	}
}

ReDirectCheck.prototype.addURL = function(toOrFrom, url){
	var list;
	var datalist;
	var domain;
	var found = false;

	if(toOrFrom == "to"){
		list = this.toURLS;
		datalist = $("#toList");
		domain = $("#toDomain");
	}else if(toOrFrom == "from"){
		list = this.fromURLS;
		datalist = $("#fromList");
		domain = $("#fromDomain");
	}
	// add to current entry
	for(var i = 0 ; i < list.length; ++i){
		if(list[i]["url"] == url){
			++list[i]["count"];
			found = true;
			break;
		}
	}
	// or create new entry
	if(found == false){
		var newURL = new Object();
		newURL.url = url;
		newURL.count = 1;
		list.push(newURL);
	}
	// sort datalist
	list.sort(
		function(a,b){
			if(a.count < b.count)
				return 1;
			if(a.count > b.count)
				return -1;
			return 0;
		});

	// write to html
	datalist.empty();
    // Create options for the Model comboBox.
    for(var j=0; j < list.length; j++) {
    	datalist.append("<option value='" + list[j].url + "'>");
    }
    if(domain.val().length < 12)
    	domain.val(list[0].url);
    /*if(toOrFrom == "to"){
    	this.checkDomain('toDomain');
	}else if(toOrFrom == "from"){
    	this.checkDomain('fromDomain');
	}*/
}


ReDirectCheck.prototype.checkFroms = function(){
	for(var i = 0; i < this.lines.length; ++i){
		this.checkFrom(i);

		for(var j = 0; j < this.lines.length; ++j){
			$("#row" + i).removeClass("alert-danger");
		}

		for(var j = 0; j < this.lines.length; ++j){
			if( (i != j) && !this.lines[i].deleted && !this.lines[j].deleted && (this.lines[i].from.trim() == this.lines[j].from.trim())){
				$("#row" + i).addClass("alert-danger");
				$("#row" + i).prop("title", i + " Redundant with row " + j);
				$("#row" + i).tooltip();
				$("#row" + j).addClass("alert-danger");
				$("#row" + j).prop("title", j + " Redundant with row " + i);
				$("#row" + j).tooltip();
			}
		}
	}
}

ReDirectCheck.prototype.checkFrom = function(index){
	var thisurl = $("#fromDomain").val() + this.lines[index].from;

	//clear past results
	$("#fromcode"+index).html('');

	$.get("getcode.php", {"url": thisurl }, function(data){
		var results = JSON.parse(data);
		var codeDef;
		var codeCondition;

		codeCondition = RDC.CodeCondition(results['code']);

		$("#fromcode"+index).html('<button class="' + codeCondition + '" type="button" data-html="true" class="btn btn-default" data-toggle="tooltip" data-placement="right" title="' + RDC.codeDef[results['code']]  + results['note'] + '" onclick="RDC.checkFrom(' + index + ')">' + results['code'] + '</button>');
		$("#fromcode"+index).children("button").tooltip();

		RDC.lines[index].fromCode = results['code'];
	});
}

ReDirectCheck.prototype.checkTos = function(){
	var toUrls = [];

	//pull urls from lines
	for(var i = 0; i < this.lines.length; ++i){
		toUrls[i] = this.lines[i].to;
	}
	//console.log(toUrls.length);

	//erase copies
	for(var i = 0; i < toUrls.length; ++i){
		for(var j = i+1; j < toUrls.length; ++j){
			if( toUrls[i] == toUrls[j]){
				toUrls[j] = "";
			}
		}
	}
	//console.log(toUrls.length);

	//delete blanks
	for(var i = toUrls.length-1; i >= 0 ; --i){
		if(toUrls[i] == "" || toUrls[i] == undefined)
			toUrls.splice(i,1);
	}

	//clear past results
	for(var i = 0; i < this.lines.length; ++i){
		$("#tocode"+i).html('');
	}

	for(var i = toUrls.length-1; i >= 0 ; --i){
		//console.log( i + " " + toUrls[i]);
		this.checkToPath(toUrls[i]);
	}
	//console.log(toUrls.length);
	//this.checkTo(i);
}

ReDirectCheck.prototype.checkTo = function(index){
	var thisurl = $("#toDomain").val() + this.lines[index].to;

	//clear past results
	$("#tocode"+index).html('');

	$.get("getcode.php", {"url": thisurl }, function(data){
		var results = JSON.parse(data);
		var codeDef;
		var codeCondition;

		codeCondition = RDC.CodeCondition(results['code']);

		$("#tocode"+index).html('<button class="' + codeCondition + '" type="button" data-html="true" class="btn btn-default" data-toggle="tooltip" data-placement="right" title="' + RDC.codeDef[results['code']] + results['note'] + '" onclick="RDC.checkTo(' + index + ')">' + results['code'] + '</button>');
		$("#tocode"+index).children("button").tooltip();
		RDC.lines[index].toCode = results['code'];
	});

}

ReDirectCheck.prototype.checkToPath = function(path){
	// if path is complete url the use path, else complete url
	var thisurl;
	if(path.indexOf("http") == 0 ){
		 thisurl = path;
	}else{
		thisurl = $("#toDomain").val() + path;
	}

	// get code for this path
	$.get("getcode.php", {"url": thisurl }, function(data){
		var results = JSON.parse(data);
		var codeDef;
		var codeCondition;

		codeCondition = RDC.CodeCondition(results['code']);

		//loop over lines array and insert the code for all
		for(var i = 0; i < RDC.lines.length; ++i){
			if(RDC.lines[i].to == path){
				$("#tocode"+i).html('<button class="' + codeCondition + '" type="button" data-html="true" class="btn btn-default" data-toggle="tooltip" data-placement="right" title="' + RDC.codeDef[results['code']] + results['note'] + '" onclick="RDC.checkTo(' + i + ')">' + results['code'] + '</button>');
				$("#tocode"+i).children("button").tooltip();

				RDC.lines[i].toCode = results['code'];
			}
		}
	});
}

ReDirectCheck.prototype.updateFrom = function(index, input){

	//console.log(input.value);
	this.lines[index].from = input.value;
	$("#fromcode"+index).html('<button type="button" data-html="true" class="btn btn-default" data-toggle="tooltip" data-placement="right" title="Re-test" onclick="RDC.checkFrom(' + index + ')"><span class="glyphicon glyphicon-refresh glyphButton"></button>');
	this.PutInStorage();
}

ReDirectCheck.prototype.updateTo = function(index, input){
	this.lines[index].to = input.value;
	//console.log(input.value);
	$("#tocode"+index).html('<button type="button" data-html="true" class="btn btn-default" data-toggle="tooltip" data-placement="right" title="Re-test" onclick="RDC.checkTo(' + index + ')"><span class="glyphicon glyphicon-refresh glyphButton"></button>');
	this.PutInStorage();
}

ReDirectCheck.prototype.openInNewPage = function(index, toOrFrom){
	var url;

	if(toOrFrom == "to"){
		url = $("#toDomain").val() + this.lines[index].to;
	}else{
		url = $("#fromDomain").val() + this.lines[index].from;
	}
	window.open(url);
}


ReDirectCheck.prototype.checkDomain = function(input){

	//in case someone left them open
	this.closeHelp();
	this.helpOpen = false;

	var thisurl = $("#"+input).val();

	// no url? clear display
	if((thisurl == "http://")||(thisurl == "https://")){
		$("#"+input).removeClass("alert-danger");
		$("#"+input).removeClass("alert-warning");
		$("#"+input).removeClass("alert-success");
		return;
	}

	//remove slash if needed
	thisurl = thisurl.replace(/\/$/,'');

	$("#"+input).val(thisurl);
	//remove classes that might have applied

	$("#"+input).removeClass("alert-danger");

	$.get("getcode.php", {"url": thisurl }, function(data){
		var results = JSON.parse(data);
		var codeDef;
		var codeCondition;

		codeCondition = RDC.CodeCondition(results['code']);

		$("#"+input).addClass(codeCondition);

		$("#"+input).attr("title", RDC.codeDef[results['code']]  + results['note']);

		$("#"+input).tooltip();
	});
}


ReDirectCheck.prototype.CodeCondition = function(code){
	switch (code){
		case "null":
		case "400":
		case "401":
		case "402":
		case "403":
		case "404":
		case "405":
		case "406":
		case "407":
		case "408":
		case "409":
		case "410":
		case "411":
		case "412":
		case "413":
		case "414":
		case "415":
		case "416":
		case "417":
			return "alert-danger";
			break;
		case "100":
		case "101":
		case "500":
		case "501":
		case "502":
		case "503":
		case "504":
		case "505":
			return "alert-warning";
			break;
		case "200":
		case "201":
		case "202":
		case "203":
		case "204":
		case "205":
		case "206":
		case "300":
		case "301":
		case "302":
		case "303":
		case "304":
		case "305":
		case "306":
		case "307":
			return "alert-success";
			break;
		default:
			return "alert-danger";
			break;
	}
}



ReDirectCheck.prototype.PopulateSiteMapList = function(){
	//in case someone left them open
	//this.closeHelp();
	this.closeHelp();
	this.helpOpen = false;

	var thisurl = $("#toDomain").val() + "/sitemap.xml";
	$("#toDomain").addClass("alert-warning");
	$("#toDomain").prop("title", thisurl + "  sitemap loading");
	$.get("getsitemap.php", {"url": thisurl }, function(data){
		$("#toDomain").removeClass("alert-warning");
		$("#toDomain").prop("title", "");
		RDC.toSiteMap = JSON.parse(data);
		var datalist = $("#sitemapList");

		RDC.toSiteMap.sort();

		// write to html
		datalist.empty();
	    // Create options for the Model comboBox.
	    for(var i=0; i < RDC.toSiteMap.length; i++) {
	    	var path;

	    	//strip domains
	    	if(RDC.toSiteMap[i].match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/) != null){
				path = RDC.toSiteMap[i].match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/)[0];
			}else{
				path = "";
			}
			RDC.toSiteMap[i] = RDC.toSiteMap[i].replace(path,"");
			if(RDC.toSiteMap[i].length > 0)
	        	datalist.append("<option value='" + RDC.toSiteMap[i] + "'/>");
	    }
	    //RDC.toSiteMap = urls.slice(0);
	});
	this.checkDomain("toDomain");
}


ReDirectCheck.prototype.sortTable = function(){
	this.lines.sort( function(a,b){
		var A = a.from.toUpperCase();
		var B = b.from.toUpperCase();
		if(A < B) {
		    return -1;
		}
		if(A > B) {
	    	return 1;
		}
		return 0;
	});
	this.drawTable();

	  /* This code used to sort the table w/o sorting the data
	  var rows = $('#tableBody tr').get();

	  rows.sort(function(a, b) {
		  var A = $(a).children('td').eq(1).children('input').val().toUpperCase();
		  var B = $(b).children('td').eq(1).children('input').val().toUpperCase();
		  if(A < B) {
		    return -1;
		  }
		  if(A > B) {
		    return 1;
		  }
		  return 0;
	  });

	  $.each(rows, function(index, row) {
	    $('#tableBody').append(row);
	  });*/
}


ReDirectCheck.prototype.copyDomain = function(){
	$("#toDomain").val($("#fromDomain").val());
	this.checkDomain('toDomain');
	this.PopulateSiteMapList();
	this.PutInStorage();
}

ReDirectCheck.prototype.copyTo = function(){
	$("#fromDomain").val($("#toDomain").val());
	this.checkDomain('fromDomain');
	this.PopulateSiteMapList();
	this.PutInStorage();
}

ReDirectCheck.prototype.switchDomains = function(){
	var toDomain = $("#toDomain").val();
	$("#toDomain").val($("#fromDomain").val());
	$("#fromDomain").val(toDomain);
	this.checkDomain('fromDomain');
	this.checkDomain('toDomain');
	this.PopulateSiteMapList();
	this.PutInStorage();
}

ReDirectCheck.prototype.generate = function(){
	//in case someone left them open
	this.closeHelp();
	this.helpOpen = false;
	var innards = "# The RewriteEngine On directive only needs to appear once, not once per redirect\nRewriteEngine On\n";
	for(var i = 0; i < this.lines.length; ++i){
		if(this.lines[i].deleted == true)
			continue;
		var substring = false;
		for(var j = 0; j < this.lines.length; ++j){
			if(i==j)
				continue;
			if(this.lines[j].deleted == true)
				continue;
			if(this.lines[j].from.indexOf(this.lines[i].from) == 0){
				substring = true;
				break;
			}
		}
		// all from paths less than 4 characters long are considered substrings
		if(this.lines[i].from.length < 5){
			//console.log(this.lines[i].from);
			substring = true;
		}
		//also check against sitemap
		for(var j = 0; j < this.toSiteMap.length; ++j){
			if(this.lines[i].deleted == true)
				continue;
			if(this.toSiteMap[j].indexOf(this.lines[i].from) == 0){
				substring = true;
				break;
			}
		}
		if(substring == false){
			innards += this.rewritesFor(this.lines[i].from.trim(), this.lines[i].to.trim());
		}else{
			innards += this.rewritesFor(this.lines[i].from.trim() + "$", this.lines[i].to.trim());
		}
	}
	$("#generate").html("<pre>" + innards + "</pre>");

}

ReDirectCheck.prototype.report = function(){
	//in case someone left them open
	this.closeHelp();
	this.helpOpen = false;
	var innards = "From URL, From URL Status Code,To URL, To URL Status Code\n";
	for(var i = 0; i < this.lines.length; ++i){
		if(this.lines[i].deleted == true)
			continue;
		innards += $("#fromDomain").val() + this.lines[i].from + "," + this.lines[i].fromCode + "," + $("#toDomain").val() + this.lines[i].to + "," + this.lines[i].toCode + "\n";

	}
	$("#report").html("<pre>" + innards + "</pre>");
}


ReDirectCheck.prototype.csv = function(){
	//in case someone left them open
	this.closeHelp();
	this.helpOpen = false;
	var innards = "From URL, To URL\n";
	for(var i = 0; i < this.lines.length; ++i){
		if(this.lines[i].deleted == true)
			continue;
		innards += $("#fromDomain").val() + this.lines[i].from + "," + $("#toDomain").val() + this.lines[i].to +"\n";

	}
	$("#csv").html("<pre>" + innards + "</pre>");
}


ReDirectCheck.prototype.rewritesFor = function(source_url, dest_url){
	// First figure out if we need mod_rewrite or not
	var buffer = "";
  	var rewrite_cond = false;

  	//remove opening slashes, escape pluses, spaces, and question marks
  	source_url = source_url.replace(/^\//,'').replace(/[\+\?\s\(\)]/g, '\\$&');
  	dest_url = dest_url.replace(/^\//,'').replace(/[\+\?\s\(\)]/g, '\\$&');


	var GMindex = source_url.indexOf('?');
	if ( GMindex >= 0 && source_url.slice((GMindex +1) , source_url.length).length > 0) {
		// Source url has a query string, need rewrite_cond
		rewrite_cond = true;
		buffer += "\nRewriteCond %{QUERY_STRING} " + source_url.slice((GMindex +1) , source_url.length) + "\n";
		buffer += "RewriteRule ^/?" + source_url.substring(0,GMindex);
		if(dest_url.indexOf("http") == 0 )
			buffer += " " + dest_url + "? [R=301,L]\n\n";
		else
			buffer += " /" + dest_url + "? [R=301,L]\n\n";
	}else{
		if(dest_url.indexOf("http") == 0 )
			buffer += "RewriteRule ^/?" + source_url + " " + dest_url + "? [R=301,L]\n";
		else
			buffer += "RewriteRule ^/?" + source_url + " /" + dest_url + "? [R=301,L]\n";
	}

	return buffer;
}


ReDirectCheck.prototype.toggleHelp = function(){
	if( this.helpOpen == true){
		this.closeHelp();
		this.helpOpen = false;
	}else{
		this.openHelp();
		this.helpOpen = true;
	}
}


ReDirectCheck.prototype.openHelp = function(){
	$('#checktab').popover('show');
	$('#reporttab').popover('show');
	$('#csvtab').popover('show');
	$('#gentab').popover('show');
	$('#sortbutton').popover('show');
	$('#fromDomain').popover('show');
	$('#toDomain').popover('show');
	$('#fromreloadbutton').popover('show');
	$('#toreloadbutton').popover('show');
	$('#fromCell').popover('show');
	$('#toCell').popover('show');
	$('#clearbutton').popover('show');
	$('#toggledev').popover('show');
}

ReDirectCheck.prototype.closeHelp = function(){
	$('#checktab').popover('hide');
	$('#reporttab').popover('hide');
	$('#csvtab').popover('hide');
	$('#gentab').popover('hide');
	$('#sortbutton').popover('hide');
	$('#fromDomain').popover('hide');
	$('#toDomain').popover('hide');
	$('#fromreloadbutton').popover('hide');
	$('#toreloadbutton').popover('hide');
	$('#fromCell').popover('hide');
	$('#toCell').popover('hide');
	$('#clearbutton').popover('hide');
	$('#toggledev').popover('hide');
}


/* back up functions */
ReDirectCheck.prototype.PutInStorage = function(){
	localStorage.lines = JSON.stringify(this.lines);
	localStorage.from = $("#fromDomain").val();
	localStorage.to = $("#toDomain").val();
	//console.log("localStorage.to = " + localStorage.to);
}

ReDirectCheck.prototype.OpenStorage = function(){
	if(localStorage.lines != null){
		this.lines = JSON.parse(localStorage.lines);
		$("#fromDomain").val(localStorage.from);
		$("#toDomain").val(localStorage.to);

	//console.log("$(#toDomain).val() = " + $("#toDomain").val());
		this.drawTable();
	}
}

ReDirectCheck.prototype.ClearStorage = function(){
	delete localStorage.lines;
	delete this.lines;
	RDC = new ReDirectCheck();
	RDC.drawTable();
	$('#fromDomain').val("http://");
	$('#toDomain').val("http://");
}

ReDirectCheck.prototype.devLink = function(id){
	var oldurl;
	var newurl;
	oldurl = $("#"+id).val();

	if( oldurl.indexOf(".dev") == -1){
		newurl = oldurl.replace("www.", "").replace(/\.([a-z\.]{2,6})$/g,".dev").replace("https:", "http:");
		if(id == "fromDomain"){
			this.fromLiveURL = oldurl;
			this.checkDomain('fromDomain');
		}else if(id == "toDomain"){
			this.toLiveURL = oldurl;
			this.checkDomain('toDomain');
		}
	}else{
		if(id == "fromDomain"){
			newurl = this.fromLiveURL;
			this.checkDomain('fromDomain');
		}else if(id == "toDomain"){
			newurl = this.toLiveURL;
			this.checkDomain('toDomain');
		}
	}
	$("#"+id).val(newurl);
}