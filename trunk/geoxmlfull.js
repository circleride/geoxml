/******************************************************************************\
*  geoxml.js		                               by Lance Dyas          *
*  A Google Maps API Extension  GeoXml parser                                 *
*  GeoXml Parser based on my maps kml parser by Mike Williams called egeoxml  *
*  Additions include:   GML/WFS/GeoRSS/GPX expanded GE KML style support      *                                          
\******************************************************************************/
// Constructor
function KMLObj(title,desc,op,fid) {
	this.title = title;
  	this.description = escape(desc);
  	this.marks = [];
	this.folders = [];
	this.groundOverlays = [];
	this.open = op;
	this.folderid = fid;
	}

function $(mid){ return document.getElementById(mid);}

function GeoXml(myvar, map, url, opts) {
  // store the parameters
  this.myvar = myvar;
  this.opts = opts || {};
  this.mb = new MessageBox(map,this,"mb",this.opts.messagebox);
  this.map = map;
  this.url = url;
  if (typeof url == "string") {
    this.urls = [url];
  } else {
    this.urls = url;
  }
 
  this.mb.style = this.opts.messagestyle || { backgroundColor: "silver"};
  this.alwayspop = this.opts.alwaysinfopop || false;
  // infowindow styles
  this.titlestyle = this.opts.titlestyle || 'style = "font-family: arial, sans-serif;font-size: medium;font-weight:bold;font-size: 100%;"';
  this.descstyle = this.opts.descstyle || 'style = "font-family: arial, sans-serif;font-size: small;padding-bottom:.7em;"';
  this.directionstyle = this.opts.directionstyle || 'style="font-family: arial, sans-serif;font-size: small;padding-left: 1px;padding-top: 1px;padding-right: 4px;"';
  // sidebar
  this.sidebarfn = this.opts.sidebarfn || GeoXml.addSidebar;
  // elabel options 
  this.pointlabelopacity = this.opts.pointlabelopacity || 100;
  this.polylabelopacity = this.opts.polylabelopacity || 100;
   // other useful "global" stuff
  this.hilite  = this.opts.hilite || { color:"#aaffff",opacity: 0.3, textcolor:"#000000" };
  this.latestsidebar = "";
  this.forcefoldersopen = false;
  if(typeof this.opts.allfoldersopen !="undefined"){ this.forcefoldersopen = this.opts.allfoldersopen;}
 
  this.clickablepolys = true;
  if(typeof this.opts.clickablepolys == "boolean"){
	this.clickablepolys = this.opts.clickablepolys;
  	}
  this.clickablemarkers = true;
  if(typeof this.opts.clickablemarkers == "boolean" ){
       this.clickablemarkers = this.opts.clickablemarkers;  
       }
  this.clickablelines = true;
  if(typeof this.opts.clickablelines == "boolean" ){
       this.clickablelines = this.opts.clickablelines;  
       }
  if(typeof this.opts.nolegend !="undefined"){
		this.nolegend = true;
		}
  if(typeof this.opts.preloadHTML == "undefined"){
	  this.opts.preloadHTML = true;
  	}
  this.hideall = false;
  if(typeof proxy!="undefined"){ this.proxy = proxy; }
  if(!this.proxy && typeof getcapproxy !="undefined") { 
	  	if(fixUrlEnd){ getcapproxy = fixUrlEnd(getcapproxy);  } 
 		}
  if(this.opts.hideall){ this.hideall = this.opts.hideall; }
  if(top.publishdirectory){ this.publishdirectory = top.publishdirectory; }
  else {this.publishdirectory = "http://www.dyasdesigns.com/tntmap/";}
  if(top.standalone){this.publishdirectory = "";}
  this.kmlicon =  this.publishdirectory +"images/ge.png";
  this.docicon = this.publishdirectory +"images/ge.png";
  this.foldericon = this.publishdirectory + "images/folder.png";
  this.gmlicon = this.publishdirectory + "images/geo.gif";
  this.rssicon = this.publishdirectory + "images/rssb.png";
  this.globalicon = this.publishdirectory + "images/geo.gif"; 
  this.WMSICON = "<img src=\""+this.publishdirectory+"images/geo.gif\" style=\"border:none\" />";
  GeoXml.WMSICON = this.WMSICON;
  this.baseLayers = [];
  this.bounds = new GLatLngBounds();
  this.style = {width:2,opacity:0.75,fillopacity:0.4};
  this.style.color = this.randomColor();
  this.style.fillcolor = this.randomColor();
  this.iwwidth = this.opts.iwwidth || 400;
  this.lastmarker = {};   
  this.verySmall = 0.0000001;
  this.progress = 0;
  this.ZoomFactor = 2;
  this.NumLevels = 18;
  this.maxtitlewidth = 0; 
  this.styles = []; 
 
  this.jsdocs = [];
  this.jsonmarks = [];
  this.polyset = []; /* used while rendering */
  this.polygons = []; /*stores indexes to multi-polygons */ 
  this.polylines = []; /*stores indexes to multi-line */ 
  this.multibounds = []; /*stores extents of multi elements */
  this.overlayman = new Clusterer(map, this);
  this.overlayman.rowHeight = 20;
  if(this.opts.sidebarid){ this.basesidebar = this.opts.sidebarid; }
  this.kml = [new KMLObj("GeoXML","",true,0)];
  this.overlayman.folders.push([]);
  this.overlayman.subfolders.push([]);
  this.overlayman.folderhtml.push([]);
  this.overlayman.folderhtmlast.push(0);
  this.overlayman.folderBounds.push(new GLatLngBounds()); 
  this.wmscount = 0;
  this.labels = new GTileLayerOverlay(G_HYBRID_MAP.getTileLayers()[1]);
  }


GeoXml.prototype.showIt = function (str, h, w) {
	var features = "status=yes,resizable=yes,toolbar=0,height=" + h + ",width=" + h + ",scrollbars=yes";
	var myWin;
	if (top.widget) {
		alert(str);
		this.mb.showMess(str);
		}
	else {
		myWin = window.open("", "_blank", features);
		myWin.document.open("text/xml");
		myWin.document.write(str);
		myWin.document.close();
		}
	};

GeoXml.prototype.clear = function(idx) {
	for(var m=0;m<this.overlayman.markers.length;m++){
		this.overlayman.RemoveMarker(this.overlayman.markers[m]);
		}
	this.kml = [new KMLObj("GeoXML","",true,0)];
 	this.maxtitlewidth = 0;
  	this.styles = []; 
	// associative array
  	this.jsdocs = [];
  	this.jsonmarks = [];
  	this.polyset = []; 
	/* used while rendering */
  	this.polylines = [];
  	this.multibounds = []; 
	this.bounds = new GLatLngBounds();
  	this.overlayman = new Clusterer(this.map, this);
  	this.overlayman.rowHeight = 20;
	$(this.basesidebar).innerHTML = "";
  	this.overlayman.folders.push([]);
  	this.overlayman.subfolders.push([]);
  	this.overlayman.folderhtml.push([]);
  	this.overlayman.folderhtmlast.push(0);
	this.overlayman.byname = [];
    	this.overlayman.byid = [];
  	this.overlayman.folderBounds.push(new GLatLngBounds()); 
 	this.wmscount = 0;
	};

 
// Create Marker
GeoXml.prototype.createMarkerJSON = function(item,idx) {
	var that = this;
	var style = that.makeIcon(style, item.href);
 	var point = new GLatLng(item.y,item.x);
	that.overlayman.folderBounds[idx].extend(point);
	that.bounds.extend(point);

	if(item.shadow){ style.shadow = item.shadow; }
		else{ style.shadow = null; }
	if (!!that.opts.createmarker) {
          	that.opts.createmarker(point, item.title, unescape(item.description), null, idx, style, item.visibility, item.id);
        	} 
	else {
          	that.createMarker(point, item.title, unescape(item.description), null, idx, style, item.visibility, item.id);
        	}
	};
 
GeoXml.prototype.createMarker = function(point,name,desc,style,idx,instyle,visible,kml_id) {
   var myvar=this.myvar;
   var icon;
   var bicon = new GIcon();
   if(this.opts.baseicon){
	bicon.iconSize = this.opts.baseicon.iconSize;
	bicon.iconAnchor = this.opts.baseicon.iconAnchor;
	bicon.shadowSize = this.opts.baseicon.shadowSize;
	bicon.infoWindowAnchor = this.opts.baseicon.infoWindowAnchor;
	}
   else {
	//bicon = G_DEFAULT_ICON;
	bicon.infoWindowAnchor=new GPoint(16,0);
  	bicon.iconSize=new GSize(32,32);
  	bicon.shadowSize=new GSize(32,32);
   	bicon.iconAnchor=new GPoint(16,32);
  	}
   
   var shadow;
   var href;
  if(this.opts.iconFromDescription){
	var text = desc;
 	var pattern = new RegExp ("<\\s*img", "ig");
	var result;
	var pattern2 = /src\s*=\s*[\'\"]/;
	var pattern3 = /[\'\"]/;
    	while ((result = pattern.exec(text))!= null) {
		var stuff = text.substr(result.index);
		var result2 = pattern2.exec(stuff);
      		if (result2!= null) {
        		stuff = stuff.substr(result2.index+result2[0].length);
        		var result3 = pattern3.exec(stuff);
        		if (result3!= null) {
          			var imageUrl = stuff.substr(0,result3.index);
	 			 href = imageUrl;
          			}
       			}
     		}
	shadow = null;
	if(!href){
		href = "http://maps.google.com/mapfiles/kml/pal3/icon40.png";
		}

	icon = new GIcon(bicon, href, null, shadow);
	}
  else {
    href = "http://maps.google.com/mapfiles/kml/pal3/icon40";
    if(instyle == null || typeof instyle == "undefined"){
	shadow = href + "s.png";
	href += ".png";
	if(this.opts.baseicon){
		href = this.opts.baseicon.image;
		shadow = this.opts.baseicon.shadow;
		}
	}
   else { 
	if(instyle.href) { href = instyle.href; }
	if(instyle.shadow) { shadow = instyle.shadow; }
	}
   icon = new GIcon(bicon, href, null, shadow );
  }
  var iwoptions = this.opts.iwoptions || {};
  var markeroptions = this.opts.markeroptions || {};
  var icontype = this.opts.icontype || "style";
  if (icontype == "style") {
    if (!!this.styles[style]) {
      icon = new GIcon(bicon, this.styles[style].href, null, this.styles[style].shadow);
      icon.src =  this.styles[style].href;
      href =  this.styles[style].href;
    }
  }
  if (!markeroptions.icon) {
    markeroptions.icon = icon;
  }
  markeroptions.title = name;
  var m = new GMarker(point, markeroptions);
  m.title = name;
  m.id = kml_id;
  var obj = {"type":"point","title":name,"description":escape(desc),"href":href,"shadow": shadow,"visibility":visible,"x":point.x,"y": point.y,"id": m.id};
  this.kml[idx].marks.push(obj);

  if (this.opts.pointlabelclass) {
    var l = new ELabel(point, name, this.opts.pointlabelclass, this.opts.pointlabeloffset, this.pointlabelopacity, true);
    m.label = l;
    this.map.addOverlay(l);
  }
 var html,html1,html2,html3,html4;
 var awidth = this.iwwidth;
 if(desc.length * 8 <  awidth){
	awidth = desc.length * 8;
 	}
 if(awidth < name.length * 10){
	awidth = name.length * 10;
 	}
   html = "<div style = 'width:"+awidth+"px'>" + "<h1 "+this.titlestyle+">"+name+"</h1>" +"<div "+this.descstyle+">"+desc+"</div>";
  if (this.opts.directions) {
    html1 = html + '<div '+this.directionstyle+'>'
                     + 'Get Directions: <a href="#" onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click2\');return false;">To Here</a> - ' 
                     + '<a href="#" onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click3\');return false;">From Here</a><br>'
                     + '<a href="#" onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click4\');return false;">Search nearby</a></div>';
    html2 = html + '<div '+this.directionstyle+'>'
                     + 'Get Directions: To here - '
                     + '<a href="#" onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click3\');return false;">From Here</a><br>'
                     + 'Start address:<form action="http://maps.google.com/maps" method="get" target="_blank">'
                     + '<input type="text" SIZE=35 MAXLENGTH=80 name="saddr" id="saddr" value="" />'
                     + '<INPUT value="Go" TYPE="SUBMIT">'
                     + '<input type="hidden" name="daddr" value="' + point.lat() + ',' + point.lng() + "(" + name + ")" + '"/>'
                     + '<br><a href="# onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click\');return false;">&#171; Back</a></div>';
    html3 = html + '<div '+this.directionstyle+'>'
                     + 'Get Directions: <a href="#" onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click2\');return false;">To Here</a> - ' 
                     + 'From Here<br>'
                     + 'End address:<form action="http://maps.google.com/maps" method="get"" target="_blank">'
                     + '<input type="text" SIZE=35 MAXLENGTH=80 name="daddr" id="daddr" value="" />'
                     + '<INPUT value="Go" TYPE="SUBMIT">'
                     + '<input type="hidden" name="saddr" value="' + point.lat() + ',' + point.lng() +  "(" + name + ")" + '"/>'
                     + '<br><a href="#" onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click\');return false;">&#171; Back</a></div>';
    html4 = html + '<div '+this.directionstyle+'>'
                     + 'Search nearby: e.g. "pizza"<br>'
                     + '<form action="http://maps.google.com/maps" method="get"" target="_blank">'
                     + '<input type="text" SIZE=35 MAXLENGTH=80 name="q" id="q" value="" />'
                     + '<INPUT value="Go" TYPE="SUBMIT">'
                     + '<input type="hidden" name="near" value="' + name + ' @' + point.lat() + ',' + point.lng() + '"/>'
                   //  + '<input type="hidden" name="near" value="' +  point.lat() + ',' + point.lng() +  "(" + name + ")" + '"/>';
                     + '<br><a href="# onclick="GEvent.trigger(' + this.myvar +'.lastmarker,\'click\');return false;">&#171; Back</a></div>';
    GEvent.addListener(m, "click2", function() {
      m.openInfoWindowHtml(html2 + "</div>",iwoptions);
    });
    GEvent.addListener(m, "click3", function() {
      m.openInfoWindowHtml(html3 + "</div>",iwoptions);
    });
    GEvent.addListener(m, "click4", function() {
      m.openInfoWindowHtml(html4 + "</div>",iwoptions);
    });
  } else {
    html1 = html;
  }
 
	if(this.clickablemarkers){
  		GEvent.addListener(m, "click", function() {
  		  eval(myvar+".lastmarker = m");
  	  	m.openInfoWindowHtml(html1 + "</div>",iwoptions);
  		});
	}
  if(this.opts.domouseover){
	m.mess = html1+"</div>";
	m.geoxml = this;
  	GEvent.addListener(m,"mouseover", function(point) {if(!point){ point=m.getPoint(); } m.geoxml.mb.showMess(m.mess,5000); } );
	}
  var nhtml = "";
  var parm;
  if (this.opts.sidebarid) {
    	var folderid = this.myvar+"_folder"+idx;    
    	var n = this.overlayman.markers.length; 
	var blob = "&nbsp;<img style=\"vertical-align:text-top;padding:0;margin:0\" height=\"16\" border=\"0\" src=\""+href+"\">&nbsp;";
 	parm =  this.myvar+"$$$" +name + "$$$marker$$$" + n +"$$$" + blob + "$$$" +visible+"$$$null"; 
	m.sidebarid = this.myvar+"sb"+n;
	m.hilite = this.hilite;
	m.geoxml = this;
	GEvent.addListener(m,"mouseover", function() {
		var bar = $(this.sidebarid);
		if(bar){
			bar.style.backgroundColor = this.hilite.color;
			bar.style.color = this.hilite.textcolor;
			}
		});
	GEvent.addListener(m,"mouseout", function() {
		var bar = $(this.sidebarid);
		if(bar) {
			bar.style.background = "none"; 
			bar.style.color = "";
			}
		});

  	} 
 
  if (!!this.opts.addmarker) {
    this.opts.addmarker(m, name,idx, parm, visible);
  } else {
     this.overlayman.AddMarker(m, name,idx, parm, visible);
  }

};

// Create Polyline

GeoXml.getDescription = function(node){
   var sub=""; 
   var n = 0;
   var cn; 
    if(document.all) {
	for(;n<node.childNodes.length;n++){
	 	cn = node.childNodes.item(n);
	     	sub += cn.xml; 
		}
	}
     else {  
	var serializer = new XMLSerializer();
	for(;n<node.childNodes.length;n++){
	 	cn = serializer.serializeToString(node.childNodes.item(n));
	     	sub += cn; 
		}
	}
    var s = sub.replace("<![CDATA[","");
    var u = s.replace("]]>","");
    u = u.replace(/\&amp;/g,"&");
    u = u.replace(/\&lt;/g,"<"); 
    u = u.replace(/\&quot;/g,'"');
     u = u.replace(/\&apos;/g,"'");
    u = u.replace(/\&gt;/g,">");
    return u;
    };

GeoXml.prototype.processLine = function (pnum, lnum, idx){
	var that = this;
	var op = this.polylines[pnum];
	var line = op.lines[lnum];
	var obj;
	var p;
	if(!line){ return; }
        var thismap = this.map;
	var iwoptions = this.opts.iwoptions || {};
	var polylineEncoder = new PolylineEncoder(this.NumLevels,this.ZoomFactor,this.verySmall,true);
	if(line.length >2) {
		var result = polylineEncoder.dpEncode(line);
		obj = { points: result.encodedPoints,
			levels: result.encodedLevels,
			color: op.color,
			weight: op.width,
			opacity: op.opacity,
			clickable: op.clickablepolys,
			zoomFactor: this.ZoomFactor,
			numLevels: this.NumLevels,
			type: "polyline" 
	 		};
		p = new GPolyline.fromEncoded(obj);	
		}
	else {
 		obj = { points:line, color:op.color, weight:op.width, opacity:op.opacity, type:"line", id: op.id };
		p = new GPolyline(line,op.color,op.width,op.opacity);
		}
	p.bounds = op.pbounds;
	p.id = op.id;
	var nhtml = "";
	var n = this.overlayman.markers.length;
	this.polylines[pnum].lineidx.push(n);
	var parm;
	 var awidth = this.iwwidth;
	 var desc = op.description;
	 if(desc.length * 8 <  awidth){
		awidth = desc.length * 8;
 		}
	 if(awidth < op.name.length * 12){
		awidth = op.name.length * 12;
 		}
	var html = "<div style='font-weight: bold; font-size: medium; margin-bottom: 0em;'>"+op.name;
  	html += "</div>"+"<div style='font-family: Arial, sans-serif;font-size: small;width:"+awidth+"px;'>"+desc+"</div>";

	if(lnum == 0){
	 	if(this.opts.sidebarid) {
    			var blob = '&nbsp;&nbsp;<span style=";border-left:'+op.width+'px solid '+op.color+';">&nbsp;</span> ';
			parm =  this.myvar+"$$$" +op.name + "$$$polyline$$$" + n +"$$$" + blob + "$$$" +op.visibility+"$$$"+pnum+"$$$";
			this.latestsidebar = this.myvar +"sb"+n;
 			}
		}

	if(lnum < line.length){
		setTimeout(this.myvar+".processLine("+pnum+","+(lnum+1)+",'"+idx+"');",15);
		if(this.opts.sidebarid) { p.sidebar = this.latestsidebar; }
		}
		
	if(this.opts.domouseover){
		p.mess = html;
		}
  	p.title = op.name;
        p.geoxml = this;
        p.strokeColor = op.color;
        p.strokeWeight = op.width;
	p.strokeOpacity = op.opacity;
	p.hilite = this.hilite;
	p.mytitle = p.title;
	p.map = this.map;
	p.idx = pnum;
  	p.onOver = function(){
		var pline = this.geoxml.polylines[this.idx];
		for(var l=0;l<pline.lineidx.length;l++){
			var mark = this.geoxml.overlayman.markers[pline.lineidx[l]];
			mark.realColor = mark.strokeColor; 
			//mark.color = this.hilite.color;
			mark.setStrokeStyle({color:this.hilite.color});
			mark.redraw(true);
			}
		if(this.sidebar){
			$(this.sidebar).style.backgroundColor = this.hilite.color;
			$(this.sidebar).style.color = this.hilite.textcolor;
			}
		if(this.mess) { this.geoxml.mb.showMess(this.mess,5000); } else { this.title = "Click for more information about "+this.mytitle; }
		};
  	p.onOut = function(){ 
		var pline = this.geoxml.polylines[this.idx];
		for(var l=0; l < pline.lineidx.length; l++){
			var mark = this.geoxml.overlayman.markers[pline.lineidx[l]];
		//	mark.color = mark.realColor;
		 	mark.setStrokeStyle({color:this.realColor});
			mark.redraw(true);
			}
		this.geoxml.mb.hideMess();
		if(this.sidebar){
			$(this.sidebar).style.background = "none";
			$(this.sidebar).style.color = "";
			}
		};

 	GEvent.addListener(p,"mouseout",p.onOut);
 	GEvent.addListener(p,"mouseover",p.onOver);

  	GEvent.addListener(p,"click", function(point) {var doit=false; if(!point) { point = this.getPoint();doit=true; } 
	if(this.geoxml.clickablelines||doit){ this.map.openInfoWindowHtml(point, html, iwoptions); }} );
	obj.name = op.name;
        obj.description = escape(op.description);
	if(that.hideall) { 
		op.visibility = false;
		}
	obj.visibility = op.visibility;
 	this.kml[idx].marks.push(obj); 
 	this.overlayman.AddMarker(p, op.name, idx, parm, op.visibility);
};

GeoXml.prototype.createPolyline = function(lines,color,width,opacity,pbounds,name,desc,idx, visible, kml_id) {
    	var p = {};
   	if(!color){p.color = this.randomColor();}
  	else { p.color = color; }
  	if(!opacity){p.opacity= 0.45;}
		else { p.opacity = opacity; }
  	if(!width){p.width = 2;}
 		 else{  p.width = width; }
  	p.idx = idx; 
	p.visibility = visible;
	if(this.hideall){ p.visibility = false; }
	p.name = name;
	p.description = desc;
 	p.lines = lines;
        p.lineidx = [];
	p.id = kml_id;
 	this.polylines.push(p);
	setTimeout(this.myvar+".processLine("+(this.polylines.length-1)+",0,'"+idx+"');",15);
	};

// Create Polygon

GeoXml.prototype.processPLine = function(pnum,linenum,idx) {
        
	var p = this.polyset[pnum];
	var line = p.lines[linenum];
	var obj = {};
	
	if(line && line.length){
		var polylineEncoder = new PolylineEncoder(18,2,0.00001,true);
		var result = polylineEncoder.dpEncode(line);
		obj = {};
		obj.points = result.encodedPoints;
		obj.levels = result.encodedLevels;
		obj.color = p.color;
		obj.weight = p.weight;
		obj.numLevels = 18;
		obj.zoomFactor = 2;
		obj.opacity = p.opacity;
		p.obj.polylines.push(obj);
		}
	if(linenum == p.lines.length-1){	
		this.finishPolygon(p.obj,idx);
		}
	else {
	    setTimeout(this.myvar+".processPLine("+pnum+","+(linenum+1)+",'"+idx+"');",5);
	    }
	};	

GeoXml.prototype.finishPolygon = function(op,idx) {
  op.type = "polygon";
  this.finishPolygonJSON(op,idx,false);
   };

GeoXml.prototype.finishPolygonJSON = function(op,idx,updatebound,lastpoly) {
  var that = this;
  var iwoptions = that.opts.iwoptions || {};
  if(typeof op.visibility == "undefined") { op.visibility=true; }
  if(that.hideall){ op.visibility = false; }
  var desc = unescape(op.description);
  op.opacity = op.fillOpacity;
  var p = new GPolygon.fromEncoded(op);
  var html = "<div style='font-weight: bold; font-size: medium; margin-bottom: 0em;'>"+op.name+"</div>"+"<div style='font-family: Arial, sans-serif;font-size: small;width:"+this.iwwidth+"px'>"+desc+"</div>";
 var newgeom = (lastpoly != "p_"+op.name);
  if(newgeom && this.opts.sidebarid){
	this.latestsidebar = that.myvar +"sb"+  this.overlayman.markers.length;
	}
  else {
	this.latestsidebar = "";
  	}

  if(that.opts.domouseover){
  	p.mess = html;
	}
  p.strokeColor = op.polylines[0].color;
  p.mb = that.mb;
  p.hilite = that.hilite;
  p.strokeOpacity = op.polylines[0].opacity;
  p.fillOpacity = op.opacity;
  p.fillColor = op.color;
  if(!op.fill){ p.fillOpacity = 0.0; }
  if(that.domouseover){
	p.mess = html;
	}
  p.geoxml = that;
  p.title = op.name;
  p.id = op.id;
 var n = this.overlayman.markers.length;
  if(newgeom){
	that.multibounds.push(new GLatLngBounds());
 	that.polygons.push([]);
	}
  var len = that.multibounds.length-1;
  that.multibounds[len].extend(p.getBounds().getSouthWest());
  that.multibounds[len].extend(p.getBounds().getNorthEast()); 
  that.polygons[that.polygons.length-1].push(n);
  p.polyindex = that.polygons.length-1;
  p.geomindex = len;
  p.sidebarid = this.latestsidebar;
  p.onOver = function(){ 
		if(this.sidebarid){
			var bar = $(this.sidebarid);
			if(!!bar){
				bar.style.backgroundColor = this.hilite.color;
				bar.style.color = this.hilite.textcolor;
				}
			}
	 	if(this.geoxml.clickablepolys){
			var poly = this.geoxml.polygons[this.polyindex];
			if(poly) {
			    for (var pg =0;pg < poly.length;pg++) {
				var mark = this.geoxml.overlayman.markers[poly[pg]];
				mark.realColor= mark.fillColor;
				mark.setFillStyle({color:this.hilite.color});
				mark.redraw(true);
				}
			}
		}
	if(this.mess){ p.geoxml.mb.showMess(this.mess,5000); }
	};

		 
  p.onOut = function(){ 
		if(this.sidebarid){
			var bar = $(this.sidebarid);
			if(!!bar){
				bar.style.background= "none";
				bar.style.color = "";
				}
			}
		var poly;
		if(this.geoxml.clickablepolys) {
			poly = this.geoxml.polygons[this.polyindex];
			}
		if(poly) {
			for (var pg =0;pg < poly.length;pg++) {
				var mark = this.geoxml.overlayman.markers[poly[pg]];
				mark.setFillStyle({color:mark.realColor});
				mark.redraw(true);
				}
			}
		};
 
GEvent.addListener(p,"mouseout",p.onOut);
GEvent.addListener(p,"mouseover",p.onOver);

  op.description = escape(desc);
  this.kml[idx].marks.push(op);
  p.map = this.map;
  var bounds;  

  GEvent.addListener(p,"click", function(point, overlay) {
	if(!point && this.geoxml.alwayspop){
		bounds = this.geoxml.multibounds[this.geomindex];  
		this.map.setCenter(bounds.getCenter(),this.map.getBoundsZoomLevel(bounds));
       		point=bounds.getCenter(); 
		}
	if(!point){ 
		this.geoxml.mb.showMess("Zooming to "+p.title,3000);
		bounds = this.geoxml.multibounds[this.geomindex];  
		this.map.setZoom(this.map.getBoundsZoomLevel(bounds));
    		this.map.panTo(bounds.getCenter());
		}
	else { 
	 	if(this.geoxml.clickablepolys){ this.map.openInfoWindowHtml(point,html,iwoptions);} 
		}
	});

if(this.opts.polylabelclass && newgeom ) {
 	var epoint =  p.getBounds().getCenter();
        var off = this.opts.polylabeloffset;
	if(!off){ off= new GSize(0,0); }
	off.x = -(op.name.length * 6);
 	var l = new ELabel(epoint, " "+op.name+" ", this.opts.polylabelclass, off, this.polylabelopacity, true);
	p.label = l;
	this.map.addOverlay(l);
	}

  var nhtml ="";
  var parm;
 
  if (this.basesidebar &&  newgeom) { 
    var folderid = this.myvar+"_folder"+idx;
    var blob = "<span style=\"background-color:" + op.color + ";border:2px solid "+p.strokeColor+";\">&nbsp;&nbsp;&nbsp;&nbsp;</span> ";
    parm =  this.myvar+"$$$" +op.name + "$$$polygon$$$" + n +"$$$" + blob + "$$$" +op.visibility+"$$$null"; 
    }
   if(updatebound) {
  	var ne = p.getBounds().getNorthEast();
   	var sw = p.getBounds().getSouthWest();
   	this.bounds.extend(ne);
   	this.bounds.extend(sw);
   	this.overlayman.folderBounds[idx].extend(sw);
   	this.overlayman.folderBounds[idx].extend(ne);
	}
   this.overlayman.AddMarker(p,op.name,idx, parm, op.visibility);
   return op.name;
   };

GeoXml.prototype.finishLineJSON = function(po, idx, lastlinename){
	var m;
	var that = this;
	var thismap = this.map;
	if(po.type == "line"){ m = new GPolyline(po.points,po.color,po.weight,po.opacity); }
	else { m = new GPolyline.fromEncoded(po); }
	m.mytitle = po.name;
	m.title = po.name;
        m.geoxml = this;
        m.strokeColor = po.color;
        m.strokeWeight = po.weight;
	m.strokeOpacity = po.opacity;
        m.hilite = this.hilite;
	var n = that.overlayman.markers.length;
	var lineisnew = false;
	var pnum;
	if(("l_"+po.name) != lastlinename){
		lineisnew = true;
		that.polylines.push(po);
		pnum = that.polylines.length-1;
		that.polylines[pnum].lineidx = [];
		that.latestsidebar = that.myvar +"sb"+n;
		}
	else {
		pnum = that.polylines.length-1;
		that.polylines[pnum].lineidx.push(n);
		}

	if(this.opts.basesidebar){
		m.sidebarid = that.latestsidebar;
		}
  	m.onOver = function(){
			if(!!this.sidebarid){
				
				if(bar){bar.style.backgroundColor = this.hilite.color;}
				}
			this.realColor = this.strokeColor;
			mark.setStrokeStyle({color:this.hilite.color});
			this.redraw(true);
			if(this.mess) { this.geoxml.mb.showMess(this.mess,5000); } else { this.title = "Click for more information about "+this.mytitle; }
			};
  	m.onOut = function(){ 	
			if(!!this.sidebarid){
				var bar = $(this.sidebarid);
				if(bar){bar.style.background = "none"; }
				}
			mark.setStrokeStyle({color:this.realColor});
			this.redraw(true);
			if(this.mess){ this.geoxml.mb.hideMess(); }
			};
 
	GEvent.addListener(m,"mouseover",m.onOver);
	GEvent.addListener(m,"mouseover",m.onOut);
	 

	var parm = "";
	that.kml[idx].marks.push(po);
	var desc = unescape(po.description);
	 var awidth = this.iwwidth;
 	if(desc.length * 8 <  awidth){
		awidth = desc.length * 8;
 		}
 	if(awidth < po.name.length * 12){
		awidth = po.name.length * 12;
 		}

	var html = "<div style='font-weight: bold; font-size: medium; margin-bottom: 0em;'>"+po.name;
  	html += "</div><div style='font-family: Arial, sans-serif;font-size: small;width:"+awidth+"px'>"+desc+"</div>";
	m.map = this.map;
	if(this.clickablelines){
  		GEvent.addListener(m,"click", function(point) {if(!point){ point=m.getPoint(); } this.map.openInfoWindowHtml(point,html,that.opts.iwoptions);} );
		}

	if(that.basesidebar && lineisnew) {
    		var blob = '&nbsp;&nbsp;<span style=";border-left:'+po.weight+'px solid '+po.color+';">&nbsp;</span> ';
		if(typeof po.visibility == "undefined"){ po.visibility = true; }
		parm =  that.myvar+"$$$" +po.name + "$$$polyline$$$" + n +"$$$" + blob + "$$$" +po.visibility+"$$$"+(that.polylines.length-1)+"$$$";
 		}	
	
	var ne = m.getBounds().getNorthEast();
	var sw = m.getBounds().getSouthWest();
	that.bounds.extend(ne);
	that.bounds.extend(sw);
	that.overlayman.folderBounds[idx].extend(sw);
	that.overlayman.folderBounds[idx].extend(ne);

    	that.overlayman.AddMarker(m, po.name, idx, parm, po.visibility);	
	return(po.name);	
	};
	
GeoXml.prototype.handlePlaceObj = function(num, max, idx, lastlinename, depth){
	var that = this;
	var po = that.jsonmarks[num];
	var name = po.name;
	if(po.title){ name = po.title; }
	if(name.length+depth > that.maxtitlewidth){ that.maxtitlewidth = name.length+depth; }
	switch (po.type) {
			case "polygon" :
				lastlinename = "p_"+ that.finishPolygonJSON(po,idx,true,lastlinename);
				break;
			case "line" :  
			case "polyline" :
				lastlinename = "l_"+ that.finishLineJSON(po,idx,lastlinename);		
				break;
			case "point":
          			that.createMarkerJSON(po,idx);
				lastlinename = "";
				break;
		 	}
	if (num < max-1){
		var act = that.myvar+".handlePlaceObj("+(num+1)+","+max+","+idx+",\""+lastlinename+"\","+depth+");";
		document.status = "processing "+name;
		setTimeout(act,1);
		}
	else {
		lastlinename = "";		
		if(num == that.jsonmarks.length-1){
			that.progress--;
    			if (that.progress <= 0) {
      		 	// Shall we zoom to the bounds?
      				if (!that.opts.nozoom) {
        				that.map.setZoom(that.map.getBoundsZoomLevel(that.bounds));
        				that.map.setCenter(that.bounds.getCenter());
      					}
      				GEvent.trigger(that,"parsed");
				that.setFolders();
      				if(!that.opts.sidebarid){
					that.mb.showMess("Finished Parsing",1000);
					that.ParseURL();	
					}
				}
	 		}
		}
	};

GeoXml.prototype.parseJSON  = function (doc, title, latlon, desc, sbid){
	var that = this;
 	that.overlayman.miStart = new Date();
	that.jsdocs = eval('(' + doc + ')');
	var bar = $(that.basesidebar);
	if(bar){ bar.style.display=""; }
	that.recurseJSON(that.jsdocs[0], title, desc, that.basesidebar, 0);
	};

GeoXml.prototype.setFolders = function() {
	var that = this;
	var len = that.kml.length;
	for(var i=0;i<len;i++){
		var fid = that.kml[i].folderid;
		var fob = $(fid);
 		if(fob !== null) {
			if(!!that.kml[i].open){
				fob.style.display='block';
				}
			else {
				fob.style.display='none';
				}
			}
		}
	 
	};
 
GeoXml.prototype.recurseJSON = function (doc, title, desc, sbid, depth){
	var that = this;
	var polys = doc.marks;
	var name = doc.title;
	if(!sbid){ sbid = 0; }
	var description = unescape(doc.description);
	if(!description && desc){ description = desc; }
	var keepopen = that.forcefoldersopen;
	if(doc.open){ keepopen = true; }
	var visible = true;
	if(typeof doc.visibility!="undefined" && doc.visibility){visible = true; }
	if(that.hideall){visible = false;}
       	var snippet = doc.snippet;
	var idx = that.overlayman.folders.length;
	if(!description){ description = name; }
	var folderid;
	var icon;
	that.overlayman.folders.push([]);
	that.overlayman.subfolders.push([]);
    	that.overlayman.folderhtml.push([]);
    	that.overlayman.folderhtmlast.push(0);
	that.overlayman.folderBounds.push(new GLatLngBounds());
	that.kml.push(new KMLObj(title,description,keepopen));
	if((!depth && (doc.folders && doc.folders.length >1)) || doc.marks.length){
		if(depth < 2 || doc.marks.length < 1) { icon = that.globalicon; }
		else { icon = that.foldericon;}
		folderid = that.createFolder(idx, name, sbid, icon, description, snippet, keepopen, visible);
		} 
	else {
		folderid = sbid;
		}
	var parm, blob;
	var nhtml ="";
	var html;
	var m;
	var num = that.jsonmarks.length;
	var max = num + polys.length;
 	for(var p =0;p<polys.length;p++){
		var po = polys[p];
		that.jsonmarks.push(po);
		desc = unescape(po.description);
		m = null;
 		if(that.opts.preloadHTML && desc && desc.match(/<(\s)*img/i)){
			var preload = document.createElement("span");
     			preload.style.visibility = "visible";
			preload.style.position = "absolute";
			preload.style.left = "-1200px";
			preload.style.top = "-1200px";
			preload.style.zIndex = this.overlayman.markers.length; 
     			document.body.appendChild(preload);
			preload.innerHTML = desc;
			}	 
		}	

	if(that.groundOverlays){
		}

	if(polys.length){ that.handlePlaceObj(num,max,idx,null,depth); }
	var fc = 0;
	var fid = 0;
	if(typeof doc.folders!="undefined"){
		fc = doc.folders.lenth;
		for(var f=0;f<doc.folders.length;++f){
			var nextdoc = that.jsdocs[doc.folders[f]];
			fid = that.recurseJSON(nextdoc, nextdoc.title, nextdoc.description, folderid, (depth+1));
			that.overlayman.subfolders[idx].push(fid);
			that.overlayman.folderBounds[idx].extend(that.overlayman.folderBounds[fid].getSouthWest());
			that.overlayman.folderBounds[idx].extend(that.overlayman.folderBounds[fid].getNorthEast());
			if(fid != idx){ that.kml[idx].folders.push(fid); }
			}
		}

        if(fc || polys.length ){
		that.bounds.extend(that.overlayman.folderBounds[idx].getSouthWest());
		that.bounds.extend(that.overlayman.folderBounds[idx].getNorthEast());
		}

	return idx;
	};

GeoXml.prototype.createPolygon = function(lines,color,width,opacity,fillcolor,fillOpacity, pbounds, name, desc, folderid, visible,fill,outline,kml_id) {
  var thismap = this.map;
  var p = {};	
  p.obj = {"description":desc,"name":name };
  p.obj.polylines = []; 
  p.obj.id = kml_id;
  p.obj.visibility = visible;
  p.obj.fill = fill;
  p.obj.outline = outline; 
  p.fillcolor = fillcolor;
  p.obj.strokecolor = color; 
  if(!color){p.color = this.style.color;}
  else { p.color = color; }

  if(!fillcolor){ p.obj.color = this.randomColor(); }
  else {p.obj.color = fillcolor;}

  if(!opacity){p.obj.opacity= this.style.opacity;}
	else{ p.obj.opacity = opacity; }

  if(typeof fillOpacity == "undefined"){p.obj.fillOpacity = this.style.fillOpacity;}
   else { p.obj.fillOpacity = fillOpacity;}

  if(!width){p.weight = this.style.width;}
  else{  p.weight = width; }

  p.bounds = pbounds;
  p.lines = lines;
  p.sidebarid = this.opts.sidebarid;
  this.polyset.push(p);
  document.status = "processing poly "+name;
  setTimeout(this.myvar+".processPLine("+(this.polyset.length-1)+",0,'"+folderid+"')",5);
};


GeoXml.prototype.toggleFolder = function(i){
	var f = $(this.myvar+"_folder"+i);
	var tb = $(this.myvar+"TB"+i);
	if(f.style.display=="none"){
			f.style.display="";
			if(tb){ tb.style.fontWeight = "normal"; }
			}
		else{ 
			f.style.display ="none"; 
			if(tb){ tb.style.fontWeight = "bold"; }
			}
	};

GeoXml.prototype.saveJSON = function(){

	if(top.standalone){
		var fpath = browseForSave("Select a directory to place your json file","JSON Data Files (*.js)|*.js|All Files (*.*)|*.*","JSON-DATA");

 		if(typeof fpath!="undefined"){ saveLocalFile (fpath+".js", this.kml.toJSONString()); }
		return;
		}

	if(this.kml.toJSONString){
		if(typeof serverBlessJSON!="undefined"){
			serverBlessJSON(escape(this.kml.toJSONString()),"MyKJSON"); 
			}
		else {
			this.showIt(this.kml.toJSONString());
			}
		}
	else {
		alert("No JSON methods currently available");
		}
	};

GeoXml.prototype.hide = function(){
	this.toggleContents(0,false);
	};

GeoXml.prototype.show = function(){
	this.toggleContents(0,true);
	};

GeoXml.prototype.toggleContents = function(i,show){
 	var f = this.overlayman.folders[i];
	var cb;
	var j;
	var m;
	if(show){
	for (j=0;j<f.length;j++){
			m = this.overlayman.markers[f[j]];
		        m.hidden = false;	
			cb = $(this.myvar+''+f[j]+'CB');
			if(cb){ cb.checked = true; }
			if(m.hide) { m.show();  }
				else { this.map.addOverlay(m); }
			if(!!m.label){
			       	m.label.show(); 
				}
			}
		}
	else {
	   for (j=0;j<f.length;j++){
			m = this.overlayman.markers[f[j]];
			m.hidden = true;
			cb = $(this.myvar+''+f[j]+'CB');
			if(cb){cb.checked = false;}
			if(m.hide) { m.hide(); }
				else { this.map.removeOverlay(m); }
			if(!!m.label){ m.label.hide(); }
			}
		}

	var sf = this.overlayman.subfolders[i];
	if(typeof sf!="undefined"){
 		for (j=0;j<sf.length;j++){
			if(sf[j]!=i){
	 			cb = $(this.myvar+''+sf[j]+'FCB');
				if(cb){ cb.checked = (!!show);}
				this.toggleContents(sf[j],show);
				}
			}
		 }
	};


GeoXml.prototype.showHide = function(a,show, p){
	var m, i;
 	if(a!= null){	
		if(show){ 
			this.overlayman.markers[a].show(); 
			this.overlayman.markers[a].hidden = false; 
			if(!!this.overlayman.markers[a].label){ this.overlayman.markers[a].label.show(); }
			}	
		else  { this.overlayman.markers[a].hide(); 
			this.overlayman.markers[a].hidden = true;
			if(!!this.overlayman.markers[a].label){ this.overlayman.markers[a].label.hide(); }       
		}
		}
	else {
		var ms = this.polylines[p];
		if(show){
			for(i=0;i<ms.lineidx.length;i++){
				m = this.overlayman.markers[ms.lineidx[i]];
				m.hidden = false;
				if(m.hide) { m.show(); }
				else { this.map.addOverlay(m); }
				if(!!m.label){m.show(); }
				}
		    }
		else {
			for(i=0;i<ms.lineidx.length;i++){
				m = this.overlayman.markers[ms.lineidx[i]]; 
				m.hidden = true;	
				if(m.hide) { m.hide(); }
					else { this.map.removeOverlay(m); }
				if(!!m.label){m.hide(); }
				}
		    }
	    }
	};


GeoXml.prototype.toggleOff = function(a,show){
	if(show){ 
		this.map.addOverlay(this.overlayman.markers[a]); 
		this.overlayman.markers[a].hidden = false; 
		}	
	else  { this.map.removeOverlay(this.overlayman.markers[a]); 
		this.overlayman.markers[a].hidden = true;
		}

	if(this.labels.onMap){
		this.map.removeOverlay(this.labels);
 		this.map.addOverlay(this.labels); 
		}
	};

// Sidebar factory method One - adds an entry to the sidebar
GeoXml.addSidebar = function(myvar, name, type, e, graphic, ckd, i) {
   
   var check = "checked";
   if(ckd=="false"){ check = ""; }
    var h="";
    var mid = myvar+"sb"+e;
   switch(type) {
   case  "marker" :  h = '<li id="'+mid+'" onmouseout="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'mouseout\');" onmouseover="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'mouseover\');" ><input id="'+myvar+''+e+'CB" type="checkbox" style="vertical-align:middle" '+check+' onclick="'+myvar+'.showHide('+e+',this.checked)"><a href="#" onclick="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'click\');return false;">'+ graphic + name + '</a></li>';
   break;
  case  "polyline" :  h = '<li id="'+mid+'"  onmouseout="'+myvar+ '.overlayman.markers['+e+'].onOut();" onmouseover="'+myvar+ '.overlayman.markers['+e+'].onOver();" ><input id="'+myvar+''+e+'CB" type="checkbox" '+check+' onclick="'+myvar+'.showHide(null,this.checked,'+i+')"><span style="margin-top:6px;"><a href="#" onclick="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'click\');return false;">&nbsp;' + graphic + name + '</a></span></li>';
  break;
  case "polygon": h = '<li id="'+mid+'"  onmouseout="'+myvar+ '.overlayman.markers['+e+'].onOut();" onmouseover="'+myvar+ '.overlayman.markers['+e+'].onOver();" ><input id="'+myvar+''+e+'CB" type="checkbox" '+check+' onclick="'+myvar+'.showHide('+e+',this.checked)"><span style="margin-top:6px;"><a href="#" onclick="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'click\');return false;">&nbsp;' + graphic + name + '</a></span></nobr></li>';
  break;
 case "groundoverlay": h = '<li id="'+mid+'"><input id="'+myvar+''+e+'CB" type="checkbox" '+check+' onclick="'+myvar+'.showHide('+e+',this.checked)"><span style="margin-top:6px;"><a href="#" onclick="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'zoomto\');return false;">&nbsp;' + graphic + name + '</a></span></li>';
   break;
case "tiledoverlay": h = '<li id="'+mid+'"><nobr><input id="'+myvar+''+e+'CB" type="checkbox" '+check+' onclick="'+myvar+'.toggleOff('+e+',this.checked)"><span style="margin-top:6px;"><a href="#" oncontextMenu="'+myvar+'.upgradeLayer('+i+');return false;" onclick="GEvent.trigger(' + myvar+ '.overlayman.markers['+e+'],\'zoomto\');return false;">'+GeoXml.WMSICON +'&nbsp;'+ name + '</a><br />'+ graphic +'</span></li>';
   break;
}
return h;
};

// Dropdown factory method
GeoXml.addDropdown = function(myvar,name,type,i,graphic) {
    return '<option value="' + i + '">' + name +'</option>';
};

// Request to Parse an XML file

GeoXml.prototype.parse = function(titles) {
 var that = this;
 var names =[];
 if(typeof titles !="undefined"){
 if(typeof titles!= "string") {
 	names = titles;
	}
 else {
	names = titles.split(",");
	}
}
 that.progress += that.urls.length;
 for (var u=0; u<that.urls.length; u++) {
   var title = names[u];
  if(typeof title =="undefined" || !title || title =="null" ){
  	var segs = that.urls[u].split("/");
	title = segs[segs.length-1];
	}
   that.mb.showMess("Loading "+title);
   var re = /\.js$/i;
   if(that.urls[u].search(re) != -1){
	that.loadJSONUrl(this.urls[u], title);
	}
   else {
 	that.loadXMLUrl(this.urls[u], title);	}
 }
};

GeoXml.prototype.parseString = function(doc,titles,latlon) {
  var names =[];
 if(titles) {
 	names = titles.split(",");
	}
  if (typeof doc == "string") {
    this.docs = [doc];
  } else {
    this.docs = doc;
  }
  this.progress += this.docs.length;
  for (var u=0; u<this.docs.length; u++) {
    this.mb.showMess("Processing "+names[u]);
    this.processing(GXml.parse(this.docs[u]),names[u],latlon);
  }
};

GeoXml.prototype.parseXML = function(doc,titles,latlon) {
 var names =[];
 if(typeof titles !="undefined"){
 	if(typeof titles == "string") {
 		names = titles.split(",");
		}
	 else {  names = titles; }
	}

  if(typeof doc == "array"){
	this.docs = doc;
	}
  else {
 	this.docs = [doc];
	}
  this.progress += this.docs.length;
  for (var u=0; u<this.docs.length; u++) {
    this.mb.showMess("Processing "+names[u]);
    this.processing(this.docs[u],names[u],latlon);
  }
};
var currdeschead = "";
GeoXml.prototype.makeDescription = function(elem, title, depth) {
         var d = ""; 
	 var len = elem.childNodes.length;
	 var ln = 0;
	 var val;
	 while (len--) {
		var subelem = elem.childNodes.item(ln);
		var nn = subelem.nodeName;
		var sec = nn.split(":");
		var base = "";
		if(sec.length>1){ 
			base = sec[1];
			}
		else { base = nn;}
 	
		if(base.match(/^(visible|visibility|boundedBy|StyleMap|styleUrl|posList|coordinates|Style|Polygon|LineString|Point|LookAt|Envelope|Box|MultiPolygon)/)){
 			currdeschead = ""; 
			}
		else {
			
			if(base.match(/#text|the_geom|SchemaData|ExtendedData|#cdata-section/)){}
			else {
				if(base.match(/Snippet/i)){
						}
				else {	
					if(base.match(/SimpleData/)){
						base = subelem.getAttribute("name");
						}
					currdeschead = "<b>&nbsp;"+base+"&nbsp;</b> :";
					}
				}
			val = subelem.nodeValue;
			if(base.match(/(\S)*(name|title)(\S)*/i)){
			 	if(!val){ val = GXml.value(subelem); }
				title = val;
				if(val && typeof title!="undefined" && title.length > this.maxtitlewidth){
					this.maxtitlewidth = title.length;
					}
				currdeschead="";
				}
			else {
				 if(val && val.match(/(\S)+/)){		
					if (val.match(/^http:\/\/|^https:\/\//i)) {
        	    				val = '<a href="' + val + '">' + val + '</a>';
      		    				}
					else {
						if(!title || title==""){
							title = val;	
							if(val && typeof title!="undefined" && title.length > this.maxtitlewidth){
								this.maxtitlewidth = title.length;
								}
							}
						}
				
					}
			   if(val && (val.match(/(\s)*/)!=true)) { 
				d += currdeschead + "<span>"+val+"</span><br />"; currdeschead = ""; 
			   	}
			
				if(subelem.childNodes.length){
		 			var con = this.makeDescription(subelem, title, depth+1);
					if(con){
						d += con.desc;
						if(typeof con.title!="undefined" && con.title){
						 	title = con.title;
							if(title.length > this.maxtitlewidth){
								this.maxtitlewidth = title.length + depth;
								}
							}
						}
					}
				}

			}
		
		ln++;
		}
	var dc = {};
	dc.desc = d;
	dc.title = title;
	return dc;
	};

GeoXml.prototype.randomColor = function(){ 
	var color="#";
	for (var i=0;i<6;i++){
		var idx = parseInt(Math.random()*16,10)+1;
		color += idx.toString(16);
		}
	return color;
	};

GeoXml.prototype.handleGeomark = function (mark, idx, trans) {
     var that = this;
     var desc, title, name, style;
     title = "";
     desc = "";
     var styleid = 0;
     var lat, lon;
     var visible = true;
     if(this.hideall){visible = false;}
     var fill = true;
     var outline = true;
     var width, color, opacity, fillOpacity, fillColor;
     var cor = [];
     var node, nv, cm;
	var coords = "";
	var poslist=[];
	var point_count =0;
	var box_count=0;
	var line_count=0;
	var poly_count=0;
	var p;
	var points = [];
	var cc, l;
        var pbounds = new GLatLngBounds();
        var coordset=mark.getElementsByTagName("coordinates");
	if(coordset.length <1){
	    coordset=mark.getElementsByTagName("gml:coordinates");
	    }
	if(coordset.length <1){
	   	coordset = [];
	    	poslist =mark.getElementsByTagName("gml:posList");
		if(poslist.length <1) { poslist = mark.getElementsByTagName("posList"); }
		for(l =0;l<poslist.length;l++){
			coords = " ";
			cor = GXml.value(poslist.item(l)).split(' ');
			for(cc=0;cc<(cor.length-1);cc++){
					if(cor[cc] && cor[cc]!=" " && !isNaN(parseFloat(cor[cc]))){
						coords += ""+parseFloat(cor[cc])+","+parseFloat(cor[cc+1]);
						coords += " ";
						cc++;
						}
					}
			if(coords){
 				if(poslist.item(l).parentNode && (poslist.item(l).parentNode.nodeName == "gml:LineString") ){ line_count++; }
					else { poly_count++; }
				cm = "<coordinates>"+coords+"</coordinates>";
				node = GXml.parse(cm);
				if(coordset.push){ coordset.push(node); }
				}
			}

		var pos = mark.getElementsByTagName("gml:pos");
		if(pos.length <1){ pos = mark.getElementsByTagName("gml:pos"); }
		if(pos.length){
			for(p=0;p<pos.length;p++){
				nv = GXml.value(pos.item(p));
				cor = nv.split(" ");
				node = GXml.parse("<coordinates>"+cor[0]+","+cor[1]+"</coordinates>");
				if(coordset.push){ coordset.push(node); }
				}
			}
	    }

	var newcoords = false;
	point_count =0;
	box_count=0;
	line_count=0;
	poly_count=0;
     
	var dc = that.makeDescription(mark,"");
	desc = "<ul>"+dc.desc+"</ul>";
	if(!name && dc.title){
		name = dc.title;
		if(name.length > this.maxtitlewidth){
			this.maxtitlewidth = name.length;
			}
		}
	     
    
     if(newcoords && typeof lat!="undefined"){
		coordset.push(""+lon+","+lat);
		}
    
     var lines = [];
     var point;
     var skiprender;
     var bits;
     for(var c=0;c<coordset.length;c++){
     skiprender = false;
     if(coordset[c].parentNode && (coordset[c].parentNode.nodeName == "gml:Box" || coordset[c].parentNode.nodeName == "gml:Envelope" )){
	skiprender = true;
	} 

      coords = GXml.value(coordset[c]);
      coords += " ";
      coords=coords.replace(/\s+/g," "); 
      // tidy the whitespace
      coords=coords.replace(/^ /,"");    
      // remove possible leading whitespace
      coords=coords.replace(/, /,",");   
      // tidy the commas
      var path = coords.split(" ");
      // Is this a polyline/polygon?
      if (path.length == 1 || path[1] =="") {
        bits = path[0].split(",");
        point = new GLatLng(parseFloat(bits[1])/trans.ys-trans.y,parseFloat(bits[0])/trans.xs-trans.x);
        that.bounds.extend(point);
        // Does the user have their own createmarker function?
	if(!skiprender){
		if(!name){ name="un-named place"; }
        	if (!!that.opts.createmarker) {
          		that.opts.createmarker(point, name, desc, styleid, idx, null, visible);
        		} 
		else {
          		that.createMarker(point, name, desc, styleid, idx, null, visible);
        		}
		}
	}
      else {
        // Build the list of points
       	for (p=0; p<path.length-1; p++) {
         	 bits = path[p].split(",");
         	 point = new GLatLng(parseFloat(bits[1])/trans.ys-trans.y,parseFloat(bits[0])/trans.xs-trans.x);
         	 points.push(point);
         	 pbounds.extend(point);
         	 }
	 	that.bounds.extend(pbounds.getNorthEast());
	 	that.bounds.extend(pbounds.getSouthWest());
		if(!skiprender) { lines.push(points); }
	     }
	}
 	if(!lines || lines.length <1) { return; }
        var linestring=mark.getElementsByTagName("LineString");
	if(linestring.length <1){
		linestring=mark.getElementsByTagName("gml:LineString");
		}
        if (linestring.length || line_count>0) {
          // its a polyline grab the info from the style
          if (!!style) {
            width = style.width; 
            color = style.color; 
            opacity = style.opacity; 
          } else {
            width = this.style.width;
            color = this.style.color;
            opacity = this.style.opacity;
          }
          // Does the user have their own createpolyline function?
	if(!name){ name="un-named path"; }
          if (!!that.opts.createpolyline) {
            that.opts.createpolyline(lines,color,width,opacity,pbounds,name,desc,idx,visible);
          } else {
            that.createPolyline(lines,color,width,opacity,pbounds,name,desc,idx,visible);
          }
        }
        var polygons=mark.getElementsByTagName("Polygon");
	if(polygons.length <1){
		polygons=mark.getElementsByTagName("gml:Polygon");
		}

        if (polygons.length || poly_count>0) {
          // its a polygon grab the info from the style
          if (!!style) {
            width = style.width; 
            color = style.color; 
            opacity = style.opacity; 
            fillOpacity = style.fillOpacity; 
            fillColor = style.fillColor; 
            fill = style.file;
	    outline = style.outline;
          } 
	fillColor = this.randomColor();
	color = this.randomColor();
	fill = 1;
	outline = 1;

	if(!name){ name="un-named area"; }

 	if (!!that.opts.createpolygon) {
            that.opts.createpolygon(lines,color,width,opacity,fillColor,fillOpacity,pbounds,name,desc,idx,visible,fill,outline);
          } else {
            that.createPolygon(lines,color,width,opacity,fillColor,fillOpacity,pbounds,name,desc,idx,visible,fill,outline);
          }
      }  
    };

GeoXml.prototype.handlePlacemark = function (mark, idx, depth, fullstyle) {
     var that = this;
     var desc, title, name, style;
     title = "";
     desc = "";
     var styleid = 0;
     var lat, lon;
     var visible = true;
     if(this.hideall){visible = false; }
     var newcoords = false;
     var outline;
     var opacity;
     var fillcolor;
     var fillOpacity;
     var color;
     var width;
     var pbounds;
     var fill;
     var points = [];
     var lines = [];
     var bits = [];
     var point;
     var cor, node, cm, nv;
     var l, pos, p, j, k, cc;
     var kml_id = mark.getAttribute("id");
     var point_count =0;
     var box_count=0;
     var line_count=0;
     var poly_count=0;
     var coords = "";
     l = mark.getAttribute("lat");
     if(typeof l!="undefined"){ lat = l; }
     l = mark.getAttribute("lon");
     if(typeof l!="undefined"){
		newcoords = true;
		lon = l;
		}
     l = 0;
     var coordset=mark.getElementsByTagName("coordinates");
	if(coordset.length <1){
	    coordset=mark.getElementsByTagName("gml:coordinates");
	    }
	if(coordset.length <1){
	   	coordset = [];
	    	var poslist = mark.getElementsByTagName("gml:posList");
		if(!poslist.length){ 
			poslist = mark.getElementsByTagName("posList");
	       		}
		for(l =0;l<poslist.length;l++){
			coords = " ";
			var plitem = GXml.value(poslist.item(l)) + " ";
			plitem = plitem.replace(/(\s)+/g,' ');
			cor = plitem.split(' ');
			for(cc=0;cc<(cor.length-1);cc++){
					if(!isNaN(parseFloat(cor[cc])) && !isNaN(parseFloat(cor[cc+1]))){
						coords += ""+parseFloat(cor[cc+1])+","+parseFloat(cor[cc]);
						coords += " ";
						cc++;
						}
					}
			if(coords){
 				if(poslist.item(l).parentNode && (poslist.item(l).parentNode.nodeName == "gml:LineString") ){ line_count++; }
					else { poly_count++; }
				cm = "<coordinates>"+coords+"</coordinates>";
				node = GXml.parse(cm);
				if(coordset.push){ coordset.push(node); }
				}
			}

		pos = mark.getElementsByTagName("gml:pos");
		if(pos.length <1) { pos = mark.getElementsByTagName("gml:pos"); }
		if(pos.length){
			for(p=0;p<pos.length;p++){
				nv = GXml.value(pos.item(p))+" ";
				cor = nv.split(' ');
				node = GXml.parse("<coordinates>"+cor[0]+","+cor[1]+"</coordinates>");
				if(coordset.push){ coordset.push(node); }
				}
			}
	    }




 	for (var ln = 0; ln < mark.childNodes.length; ln++) {
		var nn = mark.childNodes.item(ln).nodeName;
	 	nv = GXml.value(mark.childNodes.item(ln));
		var ns = nn.split(":");
		var base;
		if(ns.length>1){ base = ns[1].toLowerCase(); }
			else { base = ns[0].toLowerCase(); }	
		
		var processme = false;
		switch(base){
			case "name": 
				name = nv;
				if(name.length+depth > this.maxtitlewidth){ this.maxtitlewidth = name.length+depth; }
				break;
			case "title":
				title = nv;
				if(title.length+depth > this.maxtitlewidth){ this.maxtitlewidth = title.length+depth; }
				break;
			case "desc":
			case "description":
			    desc = GeoXml.getDescription(mark.childNodes.item(ln));
			    if(!desc){ desc = nv; }
			    if(that.opts.preloadHTML && desc && desc.match(/<(\s)*img/i)){
					var preload = document.createElement("span");
     					preload.style.visibility = "visible";
					preload.style.position = "absolute";
					preload.style.left = "-1200px";
					preload.style.top = "-1200px";
					preload.style.zIndex = this.overlayman.markers.length; 
     					document.body.appendChild(preload);
					preload.innerHTML = desc;
					}
				break;
			case "visibility":
 				if(nv == "0"){ visible = false; }
				break;
			case "href":
			case "link":
				if(nv){
					desc += "<p><a target='_blank' href='"+nv+"'>link</a></p>";
					}
				else {
					var href = mark.childNodes.item(ln).getAttribute("href");
					if(href){
						var imtype =mark.childNodes.item(ln).getAttribute("type");
					        if(imtype.match(/image/)){
								desc += "<img style=\"width:256px\" src='"+href+"' />";
							}
						}
					}
				break;
			case "author":
				desc += "<p><b>author:</b>"+nv+"</p>";
				break;
			case "time":
				desc += "<p><b>time:</b>"+nv+"</p>";
				break;
			case "lat":
				lat=nv; 
				break; 
			case "long":
				lon=nv; 
				newcoords = true;
				break;
			case "point":
				point_count++;
                                processme = true;
				break;
			case "line":
				line_count++;processme = true;break;
			case "box":
				box_count++;processme = true;break;
			case "polygon":
				poly_count++;processme = true;break;
			case "styleurl":
				styleid = nv;
			 	break;
			case "stylemap" :
				var found = false;
				node = mark.childNodes.item(ln);
				for(j=0;(j<node.childNodes.length && !found);j++){ 
					var pair = node.childNodes[j];
					for(k =0;(k<pair.childNodes.length && !found);k++){
						var pn = pair.childNodes[k].nodeName;
						if(pn == "Style"){
							style = this.handleStyle(pair.childNodes[k]);
							found = true;
							}
						}
					}
				break;
			case "Style":
			case "style":
				style = this.handleStyle(mark.childNodes.item(ln));
				break;
			}
			if(processme){
				cor = nv.split(' ');
				coords = "";
				for(cc=0;cc<(cor.length-1);cc++){
					if(!isNaN(parseFloat(cor[cc])) && !isNaN(parseFloat(cor[cc+1]))){
						coords += ""+parseFloat(cor[cc+1])+","+parseFloat(cor[cc]);
						coords += " ";
						cc++;
						}
					}
				if(coords != ""){
					node = GXml.parse("<coordinates>"+coords+"</coordinates>");
					if(coordset.push){ coordset.push(node); }
					}
				}

		}

      if(!name && title) { name = title; }

      if(fullstyle){
		style = fullstyle;
		}
      if(styleid){
		style = this.styles[styleid];
		}

      if(typeof desc == "undefined" || !desc  ){
	    var dc = that.makeDescription(mark,"");
	    desc = "<ul>"+dc.desc+"</ul>";
	    if(!name && dc.title){
			name = dc.title;
			if((name.length +depth) > this.maxtitlewidth){
				this.maxtitlewidth = name.length + depth;
				}
			}
	    }
      
     if(newcoords && typeof lat!="undefined"){
       		 if(lat){
		    var cs = ""+lon+","+lat+" ";
		    node = GXml.parse("<coordinates>"+cs+"</coordinates>");
		    coordset.push(node);
		    }
		}
    
 

     for(var c=0;c<coordset.length;c++){
      var skiprender =false;
     if(coordset[c].parentNode && (coordset[c].parentNode.nodeName.match(/^(gml:Box|gml:Envelope)/i))){
	skiprender = true;
	} 
      coords = GXml.value(coordset[c]);
      coords += " ";
      coords=coords.replace(/(\s)+/g," "); 
      // tidy the whitespace
      coords=coords.replace(/^ /,"");    
      // remove possible leading whitespace
      //coords=coords +" "; 
      ////ensure trailing space
      coords=coords.replace(/, /,",");   
      // tidy the commas
      var path = coords.split(" ");
      // Is this a polyline/polygon?
      
      if (path.length == 1 || path[1]== "") {
        bits = path[0].split(",");
        point = new GLatLng(parseFloat(bits[1]),parseFloat(bits[0]));
        this.overlayman.folderBounds[idx].extend(point);
        // Does the user have their own createmarker function?
	if(!skiprender){
		if(!name){name="un-named place";}
        	if (!!that.opts.createmarker) {
          		that.opts.createmarker(point, name, desc, styleid, idx, style, visible, kml_id);
        		} 
		else {
          		that.createMarker(point, name, desc, styleid, idx, style, visible, kml_id);
        		}
		}
	}
      else {
        // Build the list of points
        points = [];
        pbounds = new GLatLngBounds();
       	 for (p=0; p<path.length-1; p++) {
         	 bits = path[p].split(",");
         	 point = new GLatLng(parseFloat(bits[1]),parseFloat(bits[0]));
         	 points.push(point);
         	 pbounds.extend(point);
         	 }
		this.overlayman.folderBounds[idx].extend(pbounds.getSouthWest());
	 	this.overlayman.folderBounds[idx].extend(pbounds.getNorthEast());
		this.bounds.extend(pbounds.getSouthWest());
		this.bounds.extend(pbounds.getNorthEast());
		if(!skiprender){ lines.push(points); }
	    }
	}
 	if(!lines || lines.length <1) { return; }
        var linestring=mark.getElementsByTagName("LineString");
	if(linestring.length <1){
		linestring=mark.getElementsByTagName("gml:LineString");
		}
        if (linestring.length || line_count>0) {
          // its a polyline grab the info from the style
          if (!!style) {
            width = style.width; 
            color = style.color; 
            opacity = style.opacity; 
          } else {
            width = this.style.width;
            color = this.style.color;
            opacity = this.style.opacity;
          }
          // Does the user have their own createmarker function?
	if(!name){ name="un-named path"; }
          if (!!that.opts.createpolyline) {
            that.opts.createpolyline(lines,color,width,opacity,pbounds,name,desc,idx,visible,kml_id);
          } else {
            that.createPolyline(lines,color,width,opacity,pbounds,name,desc,idx,visible,kml_id);
          }
        }
        var polygons=mark.getElementsByTagName("Polygon");
	if(polygons.length <1){
		polygons=mark.getElementsByTagName("gml:Polygon");
		}
        if (polygons.length || poly_count>0) {
          // its a polygon grab the info from the style
          if (!!style) {
            width = style.width; 
            color = style.color; 
            opacity = style.opacity; 
            fillOpacity = style.fillOpacity; 
            fillcolor = style.fillcolor;
	    fill = style.fill;
	    outline = style.outline; 
          } 
	if(typeof fill == "undefined"){ fill = 1; }
	if(typeof color == "undefined"){ color = this.style.color; }
	if(typeof fillcolor == "undefined"){ fillcolor = this.randomColor(); }
	if(!name){ name="un-named area"; }
 	if (!!that.opts.createpolygon) {
            that.opts.createpolygon(lines,color,width,opacity,fillcolor,fillOpacity,pbounds,name,desc,idx,visible,fill,outline,kml_id);
          } else {
            that.createPolygon(lines,color,width,opacity,fillcolor,fillOpacity,pbounds,name,desc,idx,visible,fill,outline,kml_id);
          }
      }  
    };

GeoXml.prototype.makeIcon = function(tempstyle, href){
	if (!!href) {
          if (!!this.opts.baseicon) {
           tempstyle = new GIcon(this.opts.baseicon,href);
	   tempstyle.href = href;
          } else {
            tempstyle = new GIcon(G_DEFAULT_ICON,href);
            tempstyle.iconSize = new GSize(32,32);
            tempstyle.shadowSize = new GSize(59,32);
            tempstyle.dragCrossAnchor = new GPoint(2,8);
            tempstyle.iconAnchor = new GPoint(16,32);
  	    tempstyle.href = href;
            if (this.opts.printgif) {
              var bits = href.split("/");
              var gif = bits[bits.length-1];
              gif = this.opts.printgifpath + gif.replace(/.png/i,".gif");
              tempstyle.printImage = gif;
              tempstyle.mozPrintImage = gif;
            }
            if (!!this.opts.noshadow) {
              tempstyle.shadow="";
            } else {
              // Try to guess the shadow image
              if (href.indexOf("/red.png")>-1 
               || href.indexOf("/blue.png")>-1 
               || href.indexOf("/green.png")>-1 
               || href.indexOf("/yellow.png")>-1 
               || href.indexOf("/lightblue.png")>-1 
               || href.indexOf("/purple.png")>-1
		|| href.indexOf("/orange.png")>-1 
               || href.indexOf("/pink.png")>-1 
		|| href.indexOf("-dot.png")>-1 ) {
                  tempstyle.shadow="http://maps.google.com/mapfiles/ms/icons/msmarker.shadow.png";
              }
              else if (href.indexOf("-pushpin.png")>-1  
		|| href.indexOf("/pause.png")>-1 
		|| href.indexOf("/go.png")>-1    
		|| href.indexOf("/stop.png")>-1     ) {
                  tempstyle.shadow="http://maps.google.com/mapfiles/ms/icons/pushpin_shadow.png";
              }
              else {
                var shadow = href.replace(".png",".shadow.png");
		if(shadow.indexOf(".jpg")){ shadow =""; }
                tempstyle.shadow=shadow;
              }
            }
          }
        }
	if (this.opts.noshadow){
		tempstyle.shadow ="";
		}
	return tempstyle;
	};
GeoXml.prototype.handleStyle = function(style,sid){
      var icons=style.getElementsByTagName("Icon");
      var tempstyle,opacity;
      var aa,bb,gg,rr;
      var fill,href,color,colormode, outline;
      if (icons.length > 0) {
        href=GXml.value(icons[0].getElementsByTagName("href")[0]);
	tempstyle = this.makeIcon(tempstyle,href);
      	}
      // is it a LineStyle ?
      var linestyles=style.getElementsByTagName("LineStyle");
      if (linestyles.length > 0) {
        var width = parseInt(GXml.value(linestyles[0].getElementsByTagName("width")[0]),10);
        if (width < 1) {width = 5;}
        color = GXml.value(linestyles[0].getElementsByTagName("color")[0]);
        aa = color.substr(0,2);
        bb = color.substr(2,2);
        gg = color.substr(4,2);
        rr = color.substr(6,2);
        color = "#" + rr + gg + bb;
        opacity = parseInt(aa,16)/256;
        if (!tempstyle) {
          tempstyle = {};
        }
        tempstyle.color=color;
        tempstyle.width=width;
        tempstyle.opacity=opacity;
      }
      // is it a PolyStyle ?
      var polystyles=style.getElementsByTagName("PolyStyle");
      if (polystyles.length > 0) {
         fill = parseInt(GXml.value(polystyles[0].getElementsByTagName("fill")[0]),10);
         outline = parseInt(GXml.value(polystyles[0].getElementsByTagName("outline")[0]),10);
         color = GXml.value(polystyles[0].getElementsByTagName("color")[0]);
         colormode = GXml.value(polystyles[0].getElementsByTagName("colorMode")[0]);

	
        if (polystyles[0].getElementsByTagName("fill").length == 0) {fill = 1;}
        if (polystyles[0].getElementsByTagName("outline").length == 0) {outline = 1;}

        aa = color.substr(0,2);
        bb = color.substr(2,2);
        gg = color.substr(4,2);
        rr = color.substr(6,2);
        color = "#" + rr + gg + bb;
        opacity = parseInt(aa,16)/256;
        if (!tempstyle) {
          tempstyle = {};
        }
	tempstyle.fill = fill;
	tempstyle.outline = outline;
	if(colormode != "random") {
        	tempstyle.fillcolor = color;
		}
	else {
		tempstyle.colortint = color;
		}
        tempstyle.fillOpacity=opacity;
        if (!fill) { tempstyle.fillOpacity = 0; }
        if (!outline) { tempstyle.opacity = 0; }
      }
	if(sid){ this.styles["#"+sid] = tempstyle; }
	return tempstyle;
};
GeoXml.prototype.processKML = function(node, marks, title, sbid, depth, paren) {  
	var that = this;
	var thismap = this.map;
	var icon;
	var grouptitle;
	var keepopen = this.forcefoldersopen;
	if (node.nodeName == "kml"){ icon = this.docicon; }
        if (node.nodeName == "Document" ){ 
		icon = this.kmlicon;  
		}
	if (node.nodeName == "Folder"){  
		icon = this.foldericon; 
		grouptitle = title; 
		}
	var pm = [];
	var sf = [];
	var desc= "";
	var snip ="";
	var i;
	var visible = false;
	if(!this.hideall){visible = true; }
	var boundsmodified = false;
        var networklink = false;
	var url;
	var ground = null;
	var opacity = 1.0;
	var wmsbounds;
	var makewms = false;
	var wmslist = [];
	var mytitle;
	var color;
	var ol;
	var n,ne,sw,se;
	var html; 
	var kml_id = node.getAttribute("id");
	for (var ln = 0; ln < node.childNodes.length; ln++) {
		var nextn = node.childNodes.item(ln);
		var nn = nextn.nodeName;
		var nv = nextn.nodeValue;
		switch (nn) {
		 	case "name":  
			case "title": 
				title = GXml.value(nextn);
				if(title.length + depth > this.maxtitlewidth){ this.maxtitlewidth = title.length+depth;	}
			 	break;
			case "Folder" :
			case "Document" :
				sf.push(nextn); 
				break;
		 	case "GroundOverlay":
				url=GXml.value(nextn.getElementsByTagName("href")[0]);
      				var north=parseFloat(GXml.value(nextn.getElementsByTagName("north")[0]));
     		 		var south=parseFloat(GXml.value(nextn.getElementsByTagName("south")[0]));
      				var east=parseFloat(GXml.value(nextn.getElementsByTagName("east")[0]));
      				var west=parseFloat(GXml.value(nextn.getElementsByTagName("west")[0]));
				var attr = GXml.value(nextn.getElementsByTagName("attribution")[0]);
      				sw = new GLatLng(south,west);
      				ne = new GLatLng(north,east); 
			      
				this.bounds.extend(sw); 
      				this.bounds.extend(ne);
				color=GXml.value(nextn.getElementsByTagName("color")[0]);
				opacity = parseInt(color.substring(1,3),16)/256;
				mytitle = GXml.value(nextn.getElementsByTagName("name")[0]);
				var arcims = /arcimsproxy/i; 
				if(url.match(arcims)) {
					url += "&bbox="+west+","+south+","+east+","+north+"&response=img";
					wmsbounds = new GLatLngBounds(sw,ne);
					makewms = true;
					ol = this.makeWMSTileLayer(url, visible, mytitle, opacity, attr, title, wmsbounds);
					if(ol) {
						ol.bounds = wmsbounds;
						ol.title = mytitle;
						ol.opacity = opacity;
						ol.visible = visible;
						ol.url = url;
						if(!this.quiet){ this.mb.showMess("Adding Tiled ArcIms Overlay "+title,1000); }
						wmslist.push(ol);
						}
					}
				else { 
				var rs = /request=getmap/i;    
				if(url.match(rs)){
					url += "&bbox="+west+","+south+","+east+","+north;
					wmsbounds = new GLatLngBounds(sw,ne);
					makewms = true;
					ol = this.makeWMSTileLayer(url, visible, mytitle, opacity, attr, title, wmsbounds);
					if(ol){ 
						ol.bounds = wmsbounds;
						ol.title = mytitle;
						ol.opacity = opacity;
						ol.visible = visible;
						ol.url = url;
						if(!this.quiet){ this.mb.showMess("Adding Tiled WMS Overlay "+title,1000);}
						wmslist.push(ol);
						}	
					}
				else {
					wmsbounds = new GLatLngBounds(sw,ne);
      					ground = new GGroundOverlay(url, wmsbounds);
					ground.bounds = wmsbounds;
					ground.getBounds = function(){ return this.bounds;};
					boundsmodified = true;
					makewms = false;
      			 		}
				}
				break;
		 	case "NetworkLink":
			        url = GXml.value(nextn.getElementsByTagName("href")[0]);
				networklink = true;
				break;
			case "description" :
			case  "Description":
				desc = GeoXml.getDescription(nextn);
				break;
			case "open":
				if(GXml.value(nextn) == "1"){  keepopen = true; }
				if(GXml.value(nextn) == "0") { keepopen = this.forcefoldersopen; }
				break;
			case "visibility":
				if(GXml.value(nextn) == "0") { visible = false; }
				break;
			case "snippet" :
				snip = GXml.value(nextn);
				break;

			default:
				for(var k=0;k<marks.length;k++){
					if(nn == marks[k]){
						pm.push(nextn);
						}					
					}
				}
			}

  
	var folderid;

	var idx = this.overlayman.folders.length;
	var me = paren;
	if(sf.length >1 || pm.length || ground || makewms ){
        	this.overlayman.folders.push([]);
		this.overlayman.subfolders.push([]);
    		this.overlayman.folderhtml.push([]);
    		this.overlayman.folderhtmlast.push(0);
		this.overlayman.folderBounds.push(new GLatLngBounds());
  		this.kml.push(new KMLObj(title, desc, false, idx));
		me = this.kml.length - 1;
		folderid = this.createFolder(idx, title, sbid, icon, desc, snip, true, visible);
		} 
	else {
		folderid = sbid;
		}


	if (node.nodeName == "Folder" || node.nodeName == "Document"){  
		this.kml[me].open = keepopen; 
		this.kml[me].folderid = folderid;
		}

	if(ground || makewms){
		this.kml[this.kml.length-1].visibility = visible;
		this.kml[this.kml.length-1].groundOverlays.push({"url":url,"bounds":wmsbounds});
		}
	 

	if(networklink){
		var re = /&amp;/g;
		url = url.replace(re,"&");
		var nl = /\n/g;
		url = url.replace(nl,"");
 		this.progress++;	
		if(!top.standalone){
			if(typeof this.proxy!="undefined") { url = this.proxy + escape(url); } 
			}
	 	var comm = this.myvar +".loadXMLUrl('"+url+"','"+title+"',null,null,'"+sbid+"');";
		setTimeout(comm,1000);
		return;
		}

	if(makewms && wmslist.length){
		for(var wo=0;wo<wmslist.length;wo++) {
			var ol = wmslist[wo];
			var blob = "";
			if (this.basesidebar) {
    				var n = this.overlayman.markers.length;
				if(!this.nolegend){
					var myurl = ol.url.replace(/height=(\d)+/i,"height=100");
					myurl = myurl.replace(/width=(\d)+/i,"width=100");
					blob = '<img src="'+myurl+'" style="width:100px" />';
					}
				}
   			parm =  this.myvar+"$$$" +ol.title + "$$$tiledoverlay$$$" + n +"$$$" + blob + "$$$" +ol.visible+"$$$"+(this.baseLayers.length-1); 
			var html = ol.desc;
			var thismap = this.map; 
			GEvent.addListener(ol,"zoomto", function() { 	
				thismap.setZoom(thismap.getBoundsZoomLevel(this.getBounds()));
				thismap.panTo(this.getBounds().getCenter()); 
				});	
	 		this.overlayman.AddMarker(ol, title, idx, parm, true, true); 
			}
		}
	
	if(ground){
		if (this.basesidebar) {
    			var n = this.overlayman.markers.length;
    			var blob = '<span style="background-color:black;border:2px solid brown;">&nbsp;&nbsp;&nbsp;&nbsp;</span> ';
   			parm =  this.myvar+"$$$" +title + "$$$polygon$$$" + n +"$$$" + blob + "$$$" +visible+"$$$null"; 
   		 
			var html = desc;
			var thismap = this.map;
			GEvent.addListener(ground,"zoomto", function() { 
						thismap.setZoom(thismap.getBoundsZoomLevel(ground.getBounds()));
						thismap.panTo(ground.getBounds().getCenter()); });
			this.overlayman.folderBounds[idx].extend(ground.getBounds().getSouthWest());
			this.overlayman.folderBounds[idx].extend(ground.getBounds().getNorthEast());
			boundsmodified = true;
			this.overlayman.AddMarker(ground,title,idx, parm, visible);
			}
		this.map.addOverlay(ground);
		}


	for(i=0;i<pm.length;i++) {
		this.handlePlacemark(pm[i], idx, depth+1);
		}
	var fc = 0;

	for(i=0;i<sf.length;i++) {
	 	 var fid = this.processKML(sf[i], marks, title, folderid, depth+1, me);
		 if(typeof fid =="number" && fid != idx){
			var sub = this.overlayman.folderBounds[fid];
			if(!sub) { 
			       this.overlayman.folderBounds[fid] = new GLatLngBounds(); 
				}
			 else {
			        var sw = this.overlayman.folderBounds[fid].getSouthWest();
			        var ne = this.overlayman.folderBounds[fid].getNorthEast();
			        this.overlayman.folderBounds[idx].extend(sw);
			        this.overlayman.folderBounds[idx].extend(ne);
			        }
			this.overlayman.subfolders[idx].push(fid);
		    if(fid!=idx){ this.kml[idx].folders.push(fid); }
			fc++;
			}
		}
	 
	if(fc || pm.length || boundsmodified){
		this.bounds.extend(this.overlayman.folderBounds[idx].getSouthWest());
		this.bounds.extend(this.overlayman.folderBounds[idx].getNorthEast());
		}

	if(sf.length == 0 && pm.length == 0 && !this.opts.basesidebar){
		this.ParseURL();
		}
	return idx;
	};


GeoXml.prototype.processGPX = function(node,title,sbid,depth) {
	var icon;
	if(node.nodeName == "gpx" ){ icon = this.gmlicon; }
	if(node.nodeName == "rte" || node.nodeName == "trk" || node.nodeName == "trkseg" ){ icon = this.foldericon; }
	var pm = [];
	var sf = [];
	var desc= "";
	var snip ="";
	var i, lon, lat, l;
	var open = this.forcefoldersopen;
	var coords = "";
	var visible = true;
	for (var ln = 0; ln < node.childNodes.length; ln++) {
		var nextn = node.childNodes.item(ln);
		var nn = nextn.nodeName;
		if(nn == "name" || nn == "title"){
			title = GXml.value(nextn);
			if(title.length + depth > this.maxtitlewidth){
				this.maxtitlewidth = title.length+depth;	
				}
			}
		if(nn == "rte"){
			sf.push(nextn); 
			}
		if(nn == "trk"){
			sf.push(nextn); 
			}
		if(nn == "trkseg"){
			sf.push(nextn); 
			}

		if(nn == "trkpt"){
			pm.push(nextn);
			l = nextn.getAttribute("lat");
     			if(typeof l!="undefined"){lat = l;}
     			l = nextn.getAttribute("lon");
     			if(typeof l!="undefined"){
				lon = l;
				coords += lon+","+lat+" ";
				}
			}

		if(nn == "rtept"){
			pm.push(nextn);
			l = nextn.getAttribute("lat");
     			if(typeof l!="undefined"){lat = l;}
     			l = nextn.getAttribute("lon");
     			if(typeof l!="undefined"){
				lon = l;
				coords += lon+","+lat+" ";
				}
			}
		if(nn == "wpt"){
			pm.push(nextn);
			}
		if(nn == "description" ||  nn == "desc"){
			desc = GXml.value(nextn);
			}

		}

	if(coords.length){
		var nc = "<?xml version=\"1.0\"?><Placemark><name>"+title+"</name><description>"+desc+"</description><LineString><coordinates>"+coords+"</coordinates></LineString></Placemark>";
		var pathnode = GXml.parse(nc).documentElement;
		pm.push(pathnode);
		}

	var folderid;
	var idx = this.overlayman.folders.length;
	if(pm.length || node.nodeName == "gpx"){
       		this.overlayman.folders.push([]);
		this.overlayman.subfolders.push([]);
    		this.overlayman.folderhtml.push([]);
    		this.overlayman.folderhtmlast.push(0);
		this.overlayman.folderBounds.push(new GLatLngBounds());
		this.kml.push(new KMLObj(title,desc,open,idx));
		folderid = this.createFolder(idx, title, sbid, icon, desc, snip, true, visible);
		} 
 	 else {
		folderid = sbid;
		}
		

	for(i=0;i<pm.length;i++) {
		this.handlePlacemark(pm[i], idx, depth+1);
		}
	
	for(i=0;i<sf.length;i++) {
	 	var fid = this.processGPX(sf[i], title, folderid, depth+1);
		this.overlayman.subfolders[idx].push(fid);
		this.overlayman.folderBounds[idx].extend(this.overlayman.folderBounds[fid].getSouthWest());
		this.overlayman.folderBounds[idx].extend(this.overlayman.folderBounds[fid].getNorthEast());
		}

	if(this.overlayman.folderBounds[idx]){
		this.bounds.extend(this.overlayman.folderBounds[idx].getSouthWest());
		this.bounds.extend(this.overlayman.folderBounds[idx].getNorthEast());
		}

	return idx;
	};

GeoXml.prototype.ParseURL = function (){
		var query = top.location.search.substring(1);
		var pairs = query.split("&");
		var marks = this.overlayman.markers;
      		for (var i=0; i<pairs.length; i++) {
		var pos = pairs[i].indexOf("=");
		var argname = pairs[i].substring(0,pos).toLowerCase();
		var val = unescape(pairs[i].substring(pos+1));
		var m = 0;
		var nae;
	 	if(val){
		switch (argname) {
			case "openbyid" :
				for(m = 0;m < marks.length;m++){
				nae = marks[m].id;
				if(nae == val){
						this.overlayman.markers[m].show();
						this.overlayman.markers[m].hidden = false; 
						GEvent.trigger(this.overlayman.markers[m],"click");
						break;
						}	
					}	
				break;
			case "kml":
			case "url":
			case "src":
			case "geoxml":
				this.urls.push(val);
				this.parse();
			break;
			case "openbyname" :
				for(m = 0;m<marks.length;m++){
					nae = marks[m].title;
					if(nae == val){	
						this.overlayman.markers[m].show();
						this.overlayman.markers[m].hidden = false;
					 	GEvent.trigger(this.overlayman.markers[m],"click");
				 		break;
						}
			  	 }
			     break;
     			 }
			}
		}
	};		


GeoXml.prototype.processing = function(xmlDoc,title, latlon, desc, sbid) {
    this.overlayman.miStart = new Date();
    if(!desc){desc = title;}
    var that = this;
    if(!sbid){ sbid = 0; }
    var shadow;
    var idx;
    var root = xmlDoc.documentElement;
    if(!root){ alert("No document found"); return 0; }
    var placemarks = [];
    var name;
    var pname;
    var styles;
    var basename = root.nodeName;
    var keepopen = that.forcefoldersopen;
    var bases = basename.split(":");
    if(bases.length>1){basename = bases[1];}
    var bar, sid, i;
    if(basename == "FeatureCollection"){
		bar = $(that.basesidebar);
		if(!title){ title = name; }
		if(typeof title == "undefined"){
			title = "Un-named GML";
			}
		if(title.length > that.maxtitlewidth){
				that.maxtitlewidth = title.length;
				}
		if(bar){bar.style.display="";}
		idx = that.overlayman.folders.length;
		that.processGML(root,title,latlon,desc,(that.kml.length-1));
		that.kml[0].folders.push(idx);
		}

    if(basename =="gpx"){
	if(!title){ title = name; }
	if(typeof title == "undefined"){
		title = "Un-named GPX";
		}
        that.title = title;
	if(title.length >that.maxtitlewidth){
		that.maxtitlewidth = title.length;
		}

	bar = $(that.basesidebar);
	if(bar){ bar.style.display=""; }
	idx = that.overlayman.folders.length;
	that.processGPX(root, title, that.basesidebar, sbid);
	that.kml[0].folders.push(idx);
	}
    else {

   if(basename == "kml") {	
        styles = root.getElementsByTagName("Style"); 
   	for (i = 0; i <styles.length; i++) {
    		sid= styles[i].getAttribute("id");
      		if(sid){ 
     	   		that.handleStyle(styles[i],sid);
	    		}
   	 	}
	styles = root.getElementsByTagName("StyleMap");
	for (i = 0; i <styles.length; i++) {
		sid = styles[i].getAttribute("id");
		if(sid){
			var found = false;
			var node = styles[i];
			for(var j=0;(j<node.childNodes.length && !found);j++){ 
				var pair = node.childNodes[j];
				for(var k =0;(k<pair.childNodes.length && !found);k++){
					var pn = pair.childNodes[k].nodeName;
					if(pn == "styleUrl"){
						var pid = GXml.value(pair.childNodes[k]);
						that.styles["#"+sid] = that.styles[pid];
						found = true;
						}
					if(pn == "Style"){
						that.handleStyle(pair.childNodes[k],sid);
						found = true;
						}
					}
				}
			}
		}

	if(!title){ title = name; }
	if(typeof title == "undefined"){
		title = "KML Document";
		}
        that.title = title;
	if(title.length >that.maxtitlewidth){
		that.maxtitlewidth = title.length;
		}
	var marknames = ["Placemark"];
	var schema = root.getElementsByTagName("Schema");  
	for(var s=0;s<schema.length;s++){
		pname = schema[s].getAttribute("parent");
		if(pname == "Placemark"){
				pname = schema[s].getAttribute("name");
			 	marknames.push(pname);
				}
			}

	bar = $(that.basesidebar);
	if(bar){ bar.style.display=""; }
	idx = that.overlayman.folders.length;
	var paren = that.kml.length-1;
	var fid = that.processKML(root, marknames, title, that.basesidebar,idx, paren);	
	that.kml[paren].folders.push(idx);
	}
     else { 
	placemarks = root.getElementsByTagName("item");
	if(placemarks.length <1){
		placemarks = root.getElementsByTagName("atom");
		}
	if(placemarks.length <1){
		placemarks = root.getElementsByTagName("entry");
		}
	if(!title){ title = name; }
	if(typeof title == "undefined"){
		title = "News Feed";
		}
        that.title = title;
	if(title.length >that.maxtitlewidth){
		that.maxtitlewidth = title.length;
		}
	var style;
	if(that.opts.baseicon){
		style = that.opts.baseicon;
		style.href = style.image;
		}
	else {
        	style = new GIcon(G_DEFAULT_ICON,that.rssicon);
        	style.iconSize = new GSize(32,32);
        	style.shadowSize = new GSize(59,32);
        	style.dragCrossAnchor = new GPoint(2,8);
       		style.iconAnchor = new GPoint(16,32);
		style.href = that.rssicon;
        	shadow = that.rssicon.replace(".png",".shadow.png");
        	style.shadow = shadow +"_shadow.png";
		}
	style.color = "#00FFFF";
	style.width = "3";
	style.opacity = 0.50;
	if(!desc){ desc = "RSS feed";}
	that.kml[0].folders.push(that.overlayman.folders.length);
    	if(placemarks.length) {
		bar = $(that.basesidebar);
		if(bar){ bar.style.display=""; }
        	that.overlayman.folders.push([]);
       		that.overlayman.folderhtml.push([]);
		that.overlayman.folderhtmlast.push(0);
		that.overlayman.folderBounds.push(new GLatLngBounds());
        	idx = that.overlayman.folders.length-1;	
		that.kml.push(new KMLObj(title,desc,keepopen,idx));
		that.kml[that.kml.length-1].open = keepopen;
		if(that.basesidebar) { 	
		var visible = true;
    		if(that.hideall){ visible = false;}
		var folderid = that.createFolder(idx,title,that.basesidebar,that.globalicon,desc,null,keepopen,visible); }
    		for (i = 0; i < placemarks.length; i++) {
     			that.handlePlacemark(placemarks[i], idx, sbid, style);
    			}
		}
	}

    }
    that.progress--;
    if(that.progress == 0){
	GEvent.trigger(that,"initialized");
	if(!that.opts.sidebarid){
		that.mb.showMess("Finished Parsing",1000);
      			// Shall we zoom to the bounds?
		}
 	if (!that.opts.nozoom && !that.basesidebar) {
        	that.map.setZoom(that.map.getBoundsZoomLevel(that.bounds));
        	that.map.setCenter(that.bounds.getCenter());
      		}
    	}
};


 
GeoXml.prototype.createFolder = function(idx, title, sbid, icon, desc, snippet, keepopen, visible){ 	      
		var sb = $(sbid);
		keepopen = true;	
	 	var folderid = this.myvar+'_folder'+ idx;
                var checked ="";
		if(visible){ checked = " checked "; }
		this.overlayman.folderhtml[folderid]="";
		var disp="display:block";
		var fw= "font-weight:normal";
 		if(typeof keepopen == "undefined" || !keepopen){
			disp ="display:none";
			fw = "font-weight:bold";
	 		}
		if(!desc || desc ==""){
			desc = title;
			}
		desc = escape(desc);
		var htm = '<ul><input type="checkbox" id="'+this.myvar+''+idx+'FCB" style="vertical-align:middle" ';
		htm += checked;
		htm += 'onclick="'+this.myvar+'.toggleContents('+idx+',this.checked)">';
		htm += '&nbsp;<span title="'+snippet+'" id="'+this.myvar+'TB'+idx+'" oncontextmenu=\"'+this.myvar+'.saveJSON('+idx+');\" onclick="'+this.myvar+'.toggleFolder('+idx+')" style=\"'+fw+'\">';
		htm += '<img style=\"vertical-align:text-top;padding:0;margin:0\" height=\"16\" border=\"0\" src="'+icon+'" /></span>&nbsp;';
		htm += '<a href="#" onclick="'+this.myvar+'.overlayman.zoomToFolder('+idx+');'+this.myvar+'.mb.showMess(\''+desc+'\',3000);return false;">' + title + '</a><br><div id=\"'+folderid+'\" style="'+disp+'"></div></ul>';
		if(sb){ sb.innerHTML = htm + sb.innerHTML; }
		return folderid;
	    };
	    

GeoXml.prototype.processGML = function(root,title, latlon, desc, me) {
    var that = this;
    var isWFS = false;
    var placemarks = [];
    var srsName;
    var isLatLon = false;
    var xmin = 0;
    var ymin = 0;
    var xscale = 1;
    var yscale = 1;
    var points, pt, pts;
    var coor, coorstr;
    var x, y, k, i;
    var name = title;
    var visible = true;
    if(this.hideall){visible = false; }
    var keepopen = that.allfoldersopen;
    var pt1, pt2, box;
    	for (var ln = 0; ln < root.childNodes.length; ln++) {
		var kid = root.childNodes.item(ln).nodeName;
		var n = root.childNodes.item(ln);
		if(kid == "gml:boundedBy" || kid  == "boundedBy"){
			 for (var j = 0; j < n.childNodes.length; j++) {
				var nn = n.childNodes.item(j).nodeName;
				var llre = /CRS:84|(4326|4269)$/i;
				if(nn == "Box" || nn == "gml:Box"){
					box =  n.childNodes.item(j);
					srsName = n.childNodes.item(j).getAttribute("srsName");
					if(srsName.match(llre)){
						isLatLon = true;
						} 
					else {
						alert("SRSname ="+srsName+"; attempting to create transform");
						 for (k = 0; k < box.childNodes.length; k++) {
							coor = box.childNodes.item(k);
							if(coor.nodeName =="gml:coordinates" ||coor.nodeName =="coordinates" ){
								coorstr =  GXml.value(coor);
								pts = coorstr.split(" ");
								pt1 = pts[0].split(",");
								pt2 = pts[1].split(",");
								xscale = (parseFloat(pt2[0]) - parseFloat(pt1[0]))/(latlon.xmax - latlon.xmin);
								yscale = (parseFloat(pt2[1]) - parseFloat(pt1[1]))/(latlon.ymax - latlon.ymin);
								xmin = pt1[0]/xscale - latlon.xmin;
								ymin = pt1[1]/yscale - latlon.ymin;
								}
							}
						}
					break;
					}
				if(nn == "Envelope" || nn == "gml:Envelope"){
					box =  n.childNodes.item(j);
					srsName = n.childNodes.item(j).getAttribute("srsName");
					if(srsName.match(llre)){
						isLatLon = true;
						} 
					else {
						alert("SRSname ="+srsName+"; attempting to create transform");
						 for (k = 0; k < box.childNodes.length; k++) {
							coor = box.childNodes.item(k);
							if(coor.nodeName =="gml:coordinates" ||coor.nodeName =="coordinates" ) {
								pts = coor.split(" ");
								var b = {"xmin":100000000,"ymin":100000000,"xmax":-100000000,"ymax":-100000000};
								for(var m = 0;m<pts.length-1;m++){
									pt = pts[m].split(",");
									x = parseFloat(pt[0]);
									y = parseFloat(pt[1]);
									if(x<b.xmin){ b.xmin = x; }
									if(y<b.ymin){ b.ymin = y; }
									if(x>b.xmax){ b.xmax = x; }
									if(y>b.ymax){ b.ymax = y; }
									}
								xscale = (b.xmax - b.xmin)/(latlon.xmax - latlon.xmin);
								yscale = (b.ymax - b.ymin)/(latlon.ymax - latlon.ymin);
								xmin = b.xmin/xscale - latlon.xmin;
								ymin = b.ymin/yscale - latlon.ymin;
								}
							}
						}
					
						}
						break;
					}
				}
		if(kid == "gml:featureMember" || kid == "featureMember"){
			placemarks.push(n);
			}
		}
 
     var folderid;
     if(!title){ title = name; }
       this.title = title;
       if(placemarks.length<1){
		alert("No features found in "+title);
		this.mb.showMess("No features found in "+title,3000);
		} 
	else {
	    this.mb.showMess("Adding "+placemarks.length+" features found in "+title);
            this.overlayman.folders.push([]);
            this.overlayman.folderhtml.push([]);
	    this.overlayman.folderhtmlast.push(0);
	    this.overlayman.folderBounds.push(new GLatLngBounds());
	    var idx = this.overlayman.folders.length-1;
	    if(this.basesidebar) {
	//	alert("before createFolder "+visible);
		folderid = this.createFolder(idx,title,this.basesidebar,this.gmlicon,desc,null,keepopen,visible);
	    	}
 	    this.kml.push(new KMLObj(title,desc,true,idx));
	    this.kml[me].open = that.opts.allfoldersopen; 
	    this.kml[me].folderid = folderid;


	if(isLatLon){
    		for (i = 0; i < placemarks.length; i++) {
     			this.handlePlacemark(placemarks[i],idx,0);
    			}
		}
	else {
	     var trans = {"xs":xscale,"ys":yscale,"x":xmin, "y":ymin };
	    for (i = 0; i < placemarks.length; i++) {
		        this.handleGeomark(placemarks[i],idx,trans,0);
		        }
	    	}
	}


	






    // Is this the last file to be processed?
};

// PolylineEncoder.js copyright Mark McClure  April/May 2007
//
// This software is placed explicitly in the public
// domain and may be freely distributed or modified.
// No warranty express or implied is provided.
//
// this is largely unchanged from the original though
// modified to reduce sqroot calls.

PolylineEncoder = function(numLevels, zoomFactor, verySmall, forceEndpoints) {
  var i;
  if(!numLevels) {
    numLevels = 18;
  }
  if(!zoomFactor) {
    zoomFactor = 2;
  }
  if(!verySmall) {
    verySmall = 0.0000001;
  }
  if(!forceEndpoints) {
    forceEndpoints = true;
  }
  this.numLevels = numLevels;
  this.zoomFactor = zoomFactor;
  this.verySmall = verySmall;
  this.veryTiny = verySmall * verySmall;
  this.forceEndpoints = forceEndpoints;
  this.zoomLevelBreaks = [];
  for(i = 0; i < numLevels; i++) {
    this.zoomLevelBreaks[i] = verySmall*Math.pow(zoomFactor, numLevels-i-1);
    this.zoomLevelBreaks[i] *= this.zoomLevelBreaks[i];
  }
};

// The main function.  Essentially the Douglas-Peucker
// algorithm, adapted for encoding. Rather than simply
// eliminating points, we record their from the
// segment which occurs at that recursive step.  These
// distances are then easily converted to zoom levels.
PolylineEncoder.prototype.dpEncode = function(points) {
  var absMaxDist = 0;
  var stack = [];
  var dists = [];
  var maxDist, maxLoc, temp, first, last, current;
  var i, encodedPoints, encodedLevels;
  var segmentLength;
  
 // if(points.length > 2) {
    stack.push([0, points.length-1]);
    while(stack.length > 0) {
      current = stack.pop();
      maxDist = 0;
      segmentLength = Math.pow(points[current[1]].lat()-points[current[0]].lat(),2) + Math.pow(points[current[1]].lng()-points[current[0]].lng(),2);
      for(i = current[0]+1; i < current[1]; i++) {
        temp = this.distance(points[i], points[current[0]], points[current[1]], segmentLength);
        if(temp > maxDist) {
          maxDist = temp;
          maxLoc = i;
          if(maxDist > absMaxDist) {
            absMaxDist = maxDist;
          }
        }
      }
      if(maxDist > this.veryTiny ) {
        dists[maxLoc] = maxDist;
        stack.push([current[0], maxLoc]);
        stack.push([maxLoc, current[1]]);
      }
    }
 // }
   
  encodedPoints = this.createEncodings(points, dists);
  encodedLevels = this.encodeLevels(points, dists, absMaxDist);
  return {
    encodedPoints: encodedPoints,
    encodedLevels: encodedLevels,
    encodedPointsLiteral: encodedPoints.replace(/\\/g,"\\\\")
  };
};

PolylineEncoder.prototype.dpEncodeToJSON = function(points,
  color, weight, opacity) {
  var result;

  result = this.dpEncode(points);
  return {
    color: color,
    weight: weight,
    opacity: opacity,
    points: result.encodedPoints,
    levels: result.encodedLevels,
    numLevels: this.numLevels,
    zoomFactor: this.zoomFactor,
    literals: result.encodePointsLiteral
  };
};

PolylineEncoder.prototype.dpEncodeToGPolyline = function(points, color, weight, opacity) {
  return new GPolyline.fromEncoded(
    this.dpEncodeToJSON(points, color, weight, opacity));
};

PolylineEncoder.prototype.dpEncodeToGPolygon = function(pointsArray,
  boundaryColor, boundaryWeight, boundaryOpacity,
  fillColor, fillOpacity, fill, outline) {
  var i, boundaries;

  boundaries =[];
  for(i=0; i<pointsArray.length; i++) {
    boundaries.push(this.dpEncodeToJSON(pointsArray[i],
      boundaryColor, boundaryWeight, boundaryOpacity));
  }
  return new GPolygon.fromEncoded({
    polylines: boundaries,
    color: fillColor,
    opacity: fillOpacity,
    fill: fill,
    outline: outline
  });
};

// distance(p0, p1, p2) computes the square distance between the point p0
// and the segment [p1,p2].  This could probably be replaced with
// something that is a bit more numerically stable.
PolylineEncoder.prototype.distance = function(p0, p1, p2, segLength) {
  var u, out;
   var dlat2 = p2.lat() - p1.lat();
   var dlong1 = p2.lng() - p1.lng();
  if(dlat2 == 0 && dlong1 == 0) {
    out = Math.pow(p2.lat()-p0.lat(),2) + Math.pow(p2.lng()-p0.lng(),2);
  }
  else {
   var dlat0 = p0.lat() - p1.lat();
   var dlong0 = p0.lng() - p1.lng();
    u = ((dlat0)*(dlat2)+(dlong0)*(dlong1))/segLength;
    if(u <= 0) {
      out = Math.pow(dlat0,2) + Math.pow(dlong0,2);
    }
    if(u >= 1) {
      out =  Math.pow(p0.lat() - p2.lat(),2) + Math.pow(p0.lng() - p2.lng(),2);
    }
    if(0 < u && u < 1) {
      out = Math.pow(dlat0-u*(dlat2),2) + Math.pow(dlong0-u*(dlong1),2);
    }
  }
  return out;
};

// The createEncodings function is very similar to Googles
// http://www.google.com/apis/maps/documentation/polyline.js
// The key difference is that not all points are encoded, 
// since some were eliminated by Douglas-Peucker.
PolylineEncoder.prototype.createEncodings = function(points, dists) {
  var i;
  var j;
  var floor = Math.floor;
  var len = points.length-2;
  var late5;
  var lnge5;
  var dlat = floor(points[0].lat() * 1e5);
  var dlng = floor(points[0].lng() * 1e5);
  var plat = dlat;
  var plng = dlng;
  var encoded_points = this.encodeSignedNumber(dlat) + this.encodeSignedNumber(dlng);
  for(j = len; j >0; j--) {
     i = len - j+1;
    if(dists[i] != undefined) {
      late5 = floor(points[i].lat() * 1e5);
      lnge5 = floor(points[i].lng() * 1e5);
      dlat = late5 - plat;
      dlng = lnge5 - plng;
      plat = late5;
      plng = lnge5;
      encoded_points += this.encodeSignedNumber(dlat) + this.encodeSignedNumber(dlng);
    }
  }
   dlat = floor(points[len+1].lat() * 1e5) - plat;
   dlng = floor(points[len+1].lng() * 1e5) - plng;
   encoded_points += this.encodeSignedNumber(dlat) + this.encodeSignedNumber(dlng);
  return encoded_points;
};

// This computes the appropriate zoom level of a point in terms of its 
// distance from the relevant segment in the DP algorithm.  Could be done
// in terms of a logarithm, but this approach makes it a bit easier to
// ensure that the level is not too large.
PolylineEncoder.prototype.computeLevel = function(dd) {
  var lev;
  if(dd > this.veryTiny) {
    lev=0;
    while(dd < this.zoomLevelBreaks[lev]) {
      lev++;
    }
    return lev;
  }
};

// Now we can use the previous function to march down the list
// of points and encode the levels.  Like createEncodings, we
// ignore points whose distance (in dists) is undefined.
PolylineEncoder.prototype.encodeLevels = function(points, dists, absMaxDist) {
  var i;
  var encoded_levels = "";
  if(this.forceEndpoints) {
    encoded_levels += this.encodeNumber(this.numLevels-1);
  } else {
    encoded_levels += this.encodeNumber(
      this.numLevels-this.computeLevel(absMaxDist)-1);
  }
  for(i=1; i < points.length-1; i++) {
    if(dists[i] != undefined) {
      encoded_levels += this.encodeNumber(
        this.numLevels-this.computeLevel(dists[i])-1);
    }
  }
  if(this.forceEndpoints) {
    encoded_levels += this.encodeNumber(this.numLevels-1);
  } else {
    encoded_levels += this.encodeNumber(
      this.numLevels-this.computeLevel(absMaxDist)-1);
  }
  return encoded_levels;
};

// This function is very similar to Googles, but I added
// some stuff to deal with the double slash issue.
PolylineEncoder.prototype.encodeNumber = function(num) {
  var encodeString = "";
  var nextValue, finalValue;
  while (num >= 0x20) {
    nextValue = (0x20 | (num & 0x1f)) + 63;
//     if (nextValue == 92) {
//       encodeString += (String.fromCharCode(nextValue));
//     }
    encodeString += (String.fromCharCode(nextValue));
    num >>= 5;
  }
  finalValue = num + 63;
//   if (finalValue == 92) {
//     encodeString += (String.fromCharCode(finalValue));
//   }
  encodeString += (String.fromCharCode(finalValue));
  return encodeString;
};

// This one is Googles verbatim.
PolylineEncoder.prototype.encodeSignedNumber = function(num) {
  var sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~(sgn_num);
  }
  return(this.encodeNumber(sgn_num));
};


// The remaining code defines a few convenience utilities.
// PolylineEncoder.latLng
PolylineEncoder.latLng = function(y, x) {
	this.y = y;
	this.x = x;
};
PolylineEncoder.latLng.prototype.lat = function() {
	return this.y;
};
PolylineEncoder.latLng.prototype.lng = function() {
	return this.x;
};

// PolylineEncoder.pointsToLatLngs
PolylineEncoder.pointsToLatLngs = function(points) {
	var i, latLngs;
	latLngs = [];
	for(i=0; i<points.length; i++) {
		latLngs.push(new PolylineEncoder.latLng(points[i][0], points[i][1]));
	}
	return latLngs;
};

// PolylineEncoder.pointsToGLatLngs
PolylineEncoder.pointsToGLatLngs = function(points) {
	var i, gLatLngs;
	gLatLngs = [];
	for(i=0; i<points.length; i++) {
		gLatLngs.push(new GLatLng(points[i][0], points[i][1]));
	}
	return gLatLngs;
};


GPolyline.prototype.getPoint = function () { return (this.getVertex(Math.round(this.getVertexCount()/2))); };
GPolyline.prototype.computeBounds = function() {
  var bounds = new GLatLngBounds();
  for (var i=0; i < this.getVertexCount() ; i++) {
	var v = this.getVertex(i);
	if(v){ bounds.extend(v); }
  	}
  this.bounds = bounds;
  return bounds;
};

GTileLayerOverlay.prototype.getBounds = function(){return this.bounds; };
GPolyline.prototype.getBounds = function() {
  if(typeof this.bounds!="undefined") { return this.bounds; }
   else { return (this.computeBounds()); }
  };

GTileLayer.prototype.getBounds = function(){
	return this.bounds;
	}; 
GPolygon.prototype.getPoint = function() { return (this.getBounds().getCenter()); };

Clusterer = function ( map , paren ) {
    this.myvar = paren.myvar;
    this.paren = paren;
    this.map = map;
    this.markers = [];
    this.byid = [];
    this.byname = [];
    this.clusters = [];
    this.timeout = null;
    this.folders = [];
    this.folderBounds = [];
    this.folderhtml = [];
    this.folderhtmlast = [];
    this.subfolders = [];
    this.currentZoomLevel = map.getZoom();
    this.isParsed = false;

    this.maxVisibleMarkers = Clusterer.defaultMaxVisibleMarkers;
    this.gridSize = Clusterer.defaultGridSize;
    this.minMarkersPerCluster = Clusterer.defaultMinMarkersPerCluster;
    this.maxLinesPerInfoBox = Clusterer.defaultMaxLinesPerInfoBox;
    this.icon = Clusterer.defaultIcon;
   
    GEvent.addListener( map, 'zoomend', Clusterer.MakeCaller( Clusterer.Display, this ) );
    GEvent.addListener( map, 'moveend', Clusterer.MakeCaller( Clusterer.Display, this ) );
    GEvent.addListener( map, 'infowindowclose', Clusterer.MakeCaller( Clusterer.PopDown, this ) );
    };


Clusterer.defaultMaxVisibleMarkers =  650;
Clusterer.defaultGridSize = 15;
Clusterer.defaultMinMarkersPerCluster = 5;
Clusterer.defaultMaxLinesPerInfoBox = 15;
Clusterer.defaultIcon = new GIcon();
Clusterer.defaultIcon.image = 'http://www.acme.com/resources/images/markers/blue_large.PNG';
Clusterer.defaultIcon.shadow = 'http://www.acme.com/resources/images/markers/shadow_large.PNG';
Clusterer.defaultIcon.iconSize = new GSize( 30, 51 );
Clusterer.defaultIcon.shadowSize = new GSize( 56, 51 );
Clusterer.defaultIcon.iconAnchor = new GPoint( 13, 34 );
Clusterer.defaultIcon.infoWindowAnchor = new GPoint( 13, 3 );
Clusterer.defaultIcon.infoShadowAnchor = new GPoint( 27, 37 );


// Call this to change the cluster icon.
Clusterer.prototype.SetIcon = function ( icon )
    {
    this.icon = icon;
    };


// Changes the maximum number of visible markers before clustering kicks in.
Clusterer.prototype.SetMaxVisibleMarkers = function ( n )
    {
    this.maxVisibleMarkers = n;
    };


// Sets the minumum number of markers for a cluster.
Clusterer.prototype.SetMinMarkersPerCluster = function ( n )
    {
    this.minMarkersPerCluster = n;
    };


// Sets the maximum number of lines in an info box.
Clusterer.prototype.SetMaxLinesPerInfoBox = function ( n )
    {
    this.maxLinesPerInfoBox = n;
    };


// Call this to add a marker.
Clusterer.prototype.AddMarker = function (marker, title, idx, sidebar, visible, forcevisible) { 
    if (marker.setMap != null){
		marker.setMap(this.map);
		}
    marker.hidden = false;
    if(visible != true){marker.hidden = true; }
    if(this.paren.hideall){marker.hidden = true; }
    marker.title = title;
    this.folders[idx].push(this.markers.length);
    var bounds = this.map.getBounds();
    var vis = false;

    if(typeof marker.getBounds =="undefined"){
		if (bounds.contains(marker.getPoint())) { vis = true;  }
		}
	else {
	     var b = marker.getBounds();
	     if(!b.isEmpty()){
	        if(bounds.intersects(b)){ vis = true;  }
		}
	}
     if(forcevisible){ vis = true; }
   // var id = this.markers.length;
    this.markers.push(marker);

    if(vis){ 
	marker.onMap = true;
    	this.map.addOverlay(marker);
	if(marker.hidden){ marker.hide(); if(!!marker.label){ marker.label.hide();}  }
 	}
    this.DisplayLater();
    if(sidebar){
	this.folderhtml[idx].push(sidebar);
	}
   // return id;
    };

Clusterer.prototype.zoomToFolder = function (idx) {
	var bounds = this.folderBounds[idx];
	this.map.setZoom(this.map.getBoundsZoomLevel(bounds));
    	this.map.panTo(bounds.getCenter());
	};


// Call this to remove a marker.
Clusterer.prototype.RemoveMarker = function ( marker ) {
    for ( var i = 0; i < this.markers.length; ++i ) {
	if ( this.markers[i] == marker ) {
	    if ( marker.onMap ){
		if(marker.label){
			this.map.removeOverlay( marker.label );
			} 
		this.map.removeOverlay( marker );
	   	}
	    for ( var j = 0; j < this.clusters.length; ++j ) {
		var cluster = this.clusters[j];
		if ( cluster!= null )
		    {
		    for ( var k = 0; k < cluster.markers.length; ++k ){
			if ( cluster.markers[k] == marker ) {
			    cluster.markers[k] = null;
			    --cluster.markerCount;
			    break;
			    }
		    	}
		    if ( cluster.markerCount == 0 ) {
			this.ClearCluster( cluster );
			this.clusters[j] = null;
			}
		    else { 
			if ( cluster == this.poppedUpCluster ){ Clusterer.RePop( this );}
		    	}
		    }
		}
	    this.markers[i] = null;
	    break;
	    } 
	}
    this.DisplayLater();
    };



Clusterer.prototype.DisplayLater = function ()
    {
    if ( this.timeout!= null ){ 
	clearTimeout( this.timeout ); }
    this.timeout = setTimeout( Clusterer.MakeCaller( Clusterer.Display, this ), 50);
    };


Clusterer.Display = function (clusterer)
    {
    var i, j, k, marker, cluster, l;
    clearTimeout( clusterer.timeout );
     
    var update_side = false;
    var count = 0;
    var clon, bits;
    var vis;
    var content;
    if(clusterer.paren.basesidebar){
    for(k = 0; k< clusterer.folderhtml.length ; k++ ){	
	var curlen = clusterer.folderhtml[k].length;
	var con = clusterer.folderhtmlast[k];
	if(con < curlen){
		var destid = clusterer.paren.myvar+"_folder"+k;
		var dest = $(destid);
		if(dest){
			if(clusterer.paren.opts.sortbyname){
			        content = dest.innerHTML;
				clon = clusterer.folderhtml[k].sort();
				for(l=0; l<curlen; l++){
 					bits = clon[l].split("$$$",7);
          				content += clusterer.paren.sidebarfn(bits[0],bits[1],bits[2],bits[3],bits[4],bits[5],bits[6]); 
					}
				}
			else {
	 		       content = dest.innerHTML;
			       clon = clusterer.folderhtml[k];
				for(l=con; l<curlen; l++){
 					bits = clon[l].split("$$$",7);
          				content += clusterer.paren.sidebarfn(bits[0],bits[1],bits[2],bits[3],bits[4],bits[5],bits[6]);  
					}
				}
				
			clusterer.folderhtmlast[k] = curlen;
			dest.innerHTML  = content;
		 	if(clusterer.paren.forcefoldersopen){
	 			dest.style.display = "block";
	 			}
			update_side = true;
			count = curlen;
			}
		else {
			alert("target folder not found "+destid);
			}
		}
		}
	}
	
  // Is this the last file to be processed?
  	
	if(update_side && count>0){
		 if (clusterer.paren.progress == 0) {
			clusterer.paren.setFolders();
     			GEvent.trigger(clusterer.paren,"parsed");
      			if(!clusterer.paren.opts.sidebarid){	
				clusterer.paren.mb.showMess("Finished Parsing",1000);
				}
			var mifinish = new Date();
			var sec = ((mifinish - clusterer.miStart)/1000+" seconds");
			clusterer.paren.mb.showMess("Loaded "+count+"  GeoXML elements in "+sec,5000);
			clusterer.paren.ParseURL();
			if (!clusterer.paren.opts.nozoom) {
        			clusterer.paren.map.setZoom(clusterer.paren.map.getBoundsZoomLevel(clusterer.paren.bounds));
        			clusterer.paren.map.setCenter(clusterer.paren.bounds.getCenter());
      				}
    			}
		}

    if (update_side && typeof resizeKML != "undefined"){
		resizeKML();
		} 

    var bounds, sw, ne, dx, dy;
    var newZoomLevel = clusterer.map.getZoom();
    if ( newZoomLevel != clusterer.currentZoomLevel )
	{
	// When the zoom level changes, we have to remove all the clusters.
	for ( i = 0; i < clusterer.clusters.length; ++i ){
	    if ( clusterer.clusters[i]!= null ) {
		clusterer.ClearCluster( clusterer.clusters[i] );
		clusterer.clusters[i] = null;
		}
	}
	clusterer.clusters.length = 0;
	clusterer.currentZoomLevel = newZoomLevel;
	}

    // Get the current bounds of the visible area.
    bounds = clusterer.map.getBounds();

    // Expand the bounds a little, so things look smoother when scrolling
    // by small amounts.
      sw = bounds.getSouthWest();
      ne = bounds.getNorthEast();
      dx = ne.lng() - sw.lng();
      dy = ne.lat() - sw.lat();
    if ( dx < 300 && dy < 150 ){
	dx *= 0.05;
	dy *= 0.05;
	bounds = new GLatLngBounds(
	new GLatLng( sw.lat() - dy, sw.lng() - dx ),
	new GLatLng( ne.lat() + dy, ne.lng() + dx ) );
	}

    // Partition the markers into visible and non-visible lists.
    var visibleMarkers = [];
    var nonvisibleMarkers = [];
    var viscount = 0;
    for ( i = 0; i < clusterer.markers.length; ++i ) {
	marker = clusterer.markers[i];
	vis = false;
	if (marker!= null ){
		var mid = clusterer.paren.myvar+"sb"+i;	
	    	if(typeof marker.getBounds =="undefined"){
			if (bounds.contains(marker.getPoint()) ) {
				vis = true; 
				if($(mid)){ 
					$(mid).className = "inView";
					}
				viscount++;
				}
			else {	if($(mid)){ 
					$(mid).className = "outView";
					}
				}
			}
	     	else {
			var b = marker.getBounds();
			 if($(mid)){ 
	            		if(bounds.intersects(b)){
					$(mid).className = "inView";
					}
				else {  $(mid).className = "outView"; }
					}
			vis = true;
			}
      		if(vis){ visibleMarkers.push(i); }
	            else { nonvisibleMarkers.push(i); }
	      
		}
	}

    // Take down the non-visible markers.
    for ( i = 0; i < nonvisibleMarkers.length; ++i )
	{
	marker = clusterer.markers[nonvisibleMarkers[i]];
	if (marker.onMap){
	    if(marker.label){
		clusterer.map.removeOverlay(marker.label);
	    	}
	    clusterer.map.removeOverlay(marker);
	    marker.onMap = false;
	     
	    }
	}

    // Take down the non-visible clusters.
    for ( i = 0; i < clusterer.clusters.length; ++i ) {
	cluster = clusterer.clusters[i];
	if(cluster!= null && cluster.marker) {
		 vis = false;
			if(typeof cluster.marker.getBounds =="undefined"){
				if (bounds.contains(cluster.marker.getPoint()) ) { vis = true; }
				}
	     	  	else {
				vis = true;
		 		}
		if (!vis && cluster.onMap) {
	    		clusterer.map.removeOverlay(cluster.marker);
	   		    cluster.onMap = false;
	    		}
		}
	}

    // Clustering!  This is some complicated stuff.  We have three goals
    // here.  One, limit the number of markers & clusters displayed, so the
    // maps code doesnt slow to a crawl.  Two, when possible keep existing
    // clusters instead of replacing them with new ones, so that the app pans
    // better.  And three, of course, be CPU and memory efficient.

    if (viscount > clusterer.maxVisibleMarkers)
	{
	// Add to the list of clusters by splitting up the current bounds
	// into a grid.
	if(!update_side){
		clusterer.paren.mb.showMess("Clustering on "+viscount+"  GeoXML elements");
		}

	var latRange = bounds.getNorthEast().lat() - bounds.getSouthWest().lat();
	var latInc = latRange / clusterer.gridSize;
	var lngInc = latInc / Math.cos( ( bounds.getNorthEast().lat() + bounds.getSouthWest().lat() ) / 2.0 * Math.PI / 180.0 );
	for ( var lat = bounds.getSouthWest().lat(); lat <= bounds.getNorthEast().lat(); lat += latInc ) {
	    for ( var lng = bounds.getSouthWest().lng(); lng <= bounds.getNorthEast().lng(); lng += lngInc ) {
			cluster = {};
			cluster.clusterer = clusterer;
			cluster.bounds = new GLatLngBounds( new GLatLng( lat, lng ), new GLatLng( lat + latInc, lng + lngInc ) );
			cluster.markers = [];
			cluster.markerCount = 0;
			cluster.onMap = false;
			cluster.marker = null;
			clusterer.clusters.push(cluster);
			}
		}

	// Put all the unclustered visible markers into a cluster - the first
	// one it fits in, which favors pre-existing clusters.
	for ( i = 0; i < visibleMarkers.length; ++i ) {
	    marker = clusterer.markers[visibleMarkers[i]];
	    if (marker!= null && !marker.inCluster ) {
		for ( j = 0; j < clusterer.clusters.length; ++j ) {
		    cluster = clusterer.clusters[j];
		    if(cluster!= null){
		        vis = false;
		        if(typeof marker.getBounds =="undefined"){ 
				    if (cluster.bounds.contains(marker.getPoint())) { vis = true;   }
				    }
		        if (vis){
				marker.inCluster = true;
			        clusterer.clusters[j].markers.push(marker);
			        ++clusterer.clusters[j].markerCount;
			        }
			    }
		    }   
		}
	    }

	// Get rid of any clusters containing only a few markers.
	for ( i = 0; i < clusterer.clusters.length; ++i ) {
	    if ( clusterer.clusters[i]!= null && clusterer.clusters[i].markerCount < clusterer.minMarkersPerCluster )
		{
		clusterer.ClearCluster( clusterer.clusters[i] );
		clusterer.clusters[i] = null;
		}
	     }

	// Shrink the clusters list.
	for ( i = clusterer.clusters.length - 1; i >= 0; --i ){
	    if ( clusterer.clusters[i]!= null ){
		break; }
	    else {
		--clusterer.clusters.length;
	    	}
		}
  
	// Ok, we have our clusters.  Go through the markers in each
	// cluster and remove them from the map if they are currently up.
	for ( i = 0; i < clusterer.clusters.length; ++i )
	    {
	    cluster = clusterer.clusters[i];
	    if ( cluster!= null )
		{
		for ( j = 0; j < cluster.markers.length; ++j )
		    {
		    marker = cluster.markers[j];
		    if ( marker!= null && marker.onMap )
			{
			clusterer.map.removeOverlay( marker );
			marker.onMap = false;
			}
		    }
		}
	    }

	// Now make cluster-markers for any clusters that need one.
	for ( i = 0; i < clusterer.clusters.length; ++i )
	    {
	    cluster = clusterer.clusters[i];
	    if ( cluster!= null && cluster.marker == null )
		{
		// Figure out the average coordinates of the markers in this
		// cluster.
		var xTotal = 0.0;
		var yTotal = 0.0;
		for ( j = 0; j < cluster.markers.length; ++j )
		    {
		    marker = cluster.markers[j];
		    if ( marker!= null )
			{
			xTotal += ( + marker.getPoint().lng() );
			yTotal += ( + marker.getPoint().lat() );
			}
		    }
		var location = new GLatLng( yTotal / cluster.markerCount, xTotal / cluster.markerCount );
		marker = new GMarker( location, { icon: clusterer.icon } );
		cluster.marker = marker;
		GEvent.addListener( marker, 'click', Clusterer.MakeCaller( Clusterer.PopUp, cluster ) );
		}
	    }

	}

    if(!update_side && viscount){
		clusterer.paren.mb.showMess("Showing "+viscount+"  GeoXML elements",500);
		}

    // Display the visible markers not already up and not in clusters.
    for ( i = 0; i < visibleMarkers.length; ++i )
	{
	marker = clusterer.markers[visibleMarkers[i]];
	if ( marker!= null && ! marker.onMap && ! marker.inCluster) {
	    if (marker.addedToMap!= null ) { marker.addedToMap(); }
	    if(marker.hidden){
		if(marker.hide){ clusterer.map.addOverlay(marker); marker.hide();
			if(!!marker.label){ marker.label.hide(); }
	       		}
		}
	    else { 
		    clusterer.map.addOverlay(marker);
		    if(!!marker.label){ clusterer.map.addOverlay(marker.label); }
	    
	    }
	    marker.onMap = true;
	    }
	}

    // Display the visible clusters not already up.
    for ( i = 0; i < clusterer.clusters.length; ++i ) {
	cluster = clusterer.clusters[i]; 
	if(cluster!= null && cluster.marker) {
	    vis = false;
	    if(typeof marker.getPoint !="undefined"){
		    if (bounds.contains( cluster.marker.getPoint())){ vis = true; }
	   		 }
	        else {
			if(bounds.intersects(cluster.marker.getBounds())) { vis=true;}
			}
	    if (!cluster.onMap && vis ) {
	        clusterer.map.addOverlay( cluster.marker );
	        cluster.onMap = true;
	        }
	    }
	}

 
    // In case a cluster is currently popped-up, re-pop to get any new
    // markers into the infobox.
   // if(addHilite)addHilite();
    Clusterer.RePop( clusterer );
    };


Clusterer.PopUp = function ( cluster )
    {
    var clusterer = cluster.clusterer;
    var html = '<table width="300">';
    var n = 0;
    for ( var i = 0; i < cluster.markers.length; ++i )
	{
	var marker = cluster.markers[i];
	if ( marker!= null )
	    {
	    ++n;
	    html += '<tr><td>';
	    if (typeof marker.getIcon!="undefined" &&  marker.getIcon().smallImage != null ){ 
		html += '<img src="' + marker.getIcon().smallImage + '">'; }
	    else {
		html += '<img src="' + marker.getIcon().image + '" width="' + ( marker.getIcon().iconSize.width / 2 ) + '" height="' + ( marker.getIcon().iconSize.height / 2 ) + '">'; }
	    html += '</td><td>' + marker.title + '</td></tr>';
	    if ( n == clusterer.maxLinesPerInfoBox - 1 && cluster.markerCount > clusterer.maxLinesPerInfoBox  )
		{
		html += '<tr><td colspan="2">...and ' + ( cluster.markerCount - n ) + ' more</td></tr>';
		break;
		}
	    }
	}
    html += '</table>';
    clusterer.map.closeInfoWindow();
    cluster.marker.openInfoWindowHtml( html );
    clusterer.poppedUpCluster = cluster;
    };


Clusterer.RePop = function ( clusterer )
    {
    if ( clusterer.poppedUpCluster!= null ){ 
	Clusterer.PopUp( clusterer.poppedUpCluster ); }
    };


Clusterer.PopDown = function ( clusterer )
    {
    clusterer.poppedUpCluster = null;
    };


Clusterer.prototype.ClearCluster = function ( cluster )
    {
    var i, marker;

    for ( i = 0; i < cluster.markers.length; ++i ) {
	if ( cluster.markers[i]!= null ) {
	    cluster.markers[i].inCluster = false;
	    cluster.markers[i] = null;
	    }
    	}
    cluster.markers.length = 0;
    cluster.markerCount = 0;
    if ( cluster == this.poppedUpCluster ) {
	this.map.closeInfoWindow(); }
    if (cluster.onMap) {
	this.map.removeOverlay( cluster.marker );
	cluster.onMap = false;
	}
    };


// This returns a function closure that calls the given routine with the
// specified arg.
Clusterer.MakeCaller = function ( func, arg )
    {
    return function () { func( arg ); };
    };


// Augment GMarker so it handles markers that have been created but
// not yet addOverlayed.

GMarker.prototype.setMap = function ( map )
    {
    this.map = map;
    };

GMarker.prototype.addedToMap = function ()
    {
    this.map = null;
    };

GMarker.prototype.origOpenInfoWindow = GMarker.prototype.openInfoWindow;
GMarker.prototype.openInfoWindow = function ( node, opts )
    {
    if ( this.map!= null ) { 
	return this.map.openInfoWindow( this.getPoint(), node, opts ); }
    else { 
	return this.origOpenInfoWindow( node, opts ); }
    };

GMarker.prototype.origOpenInfoWindowHtml = GMarker.prototype.openInfoWindowHtml;
GMarker.prototype.openInfoWindowHtml = function ( html, opts )
    {
    if ( this.map!= null ) {
	return this.map.openInfoWindowHtml( this.getPoint(), html, opts ); }
    else {
	return this.origOpenInfoWindowHtml( html, opts ); }
    };

GMarker.prototype.origOpenInfoWindowTabs = GMarker.prototype.openInfoWindowTabs;
GMarker.prototype.openInfoWindowTabs = function ( tabNodes, opts )
    {
    if ( this.map!= null ) {
	return this.map.openInfoWindowTabs( this.getPoint(), tabNodes, opts ); }
    else {
	return this.origOpenInfoWindowTabs( tabNodes, opts ); }
    };

GMarker.prototype.origOpenInfoWindowTabsHtml = GMarker.prototype.openInfoWindowTabsHtml;
GMarker.prototype.openInfoWindowTabsHtml = function ( tabHtmls, opts )
    {
    if ( this.map!= null ) {
	return this.map.openInfoWindowTabsHtml( this.getPoint(), tabHtmls, opts ); }
    else {
	return this.origOpenInfoWindowTabsHtml( tabHtmls, opts ); }
    };

GMarker.prototype.origShowMapBlowup = GMarker.prototype.showMapBlowup;
GMarker.prototype.showMapBlowup = function ( opts )
    {
    if ( this.map!= null ) { 
	return this.map.showMapBlowup( this.getPoint(), opts ); }
    else {
	return this.origShowMapBlowup( opts ); }
    };

MessageBox = function(map,paren,myvar,mb){
	this.map = map;
	this.paren = paren;
	this.myvar = paren.myvar+"."+myvar;
	this.eraseMess = null;
	this.centerMe = null;
	this.mb = null;
	if(mb){ this.mb = mb; }
	this.id = this.myvar + "_message";
	};

MessageBox.prototype.hideMess = function(){
  	this.mb.style.visiblity ="hidden"; 
	this.mb.style.left = "-1200px";
	this.mb.style.top = "-1200px";
	};

MessageBox.prototype.centerThis = function(){
	var c = this.map.getObjCenter();
	if(!this.mb){ this.mb = $(this.id); }
	if(this.centerMe){ clearTimeout(this.centerMe);}
	if(this.mb){
		var nw = this.mb.clientWidth;
		if(nw > this.map.getSize().width){
			nw = parseInt(2*this.map.getSize().width/3,10);
			this.mb.style.width = nw +"px";
			this.centerMe = setTimeout(this.myvar+".centerThis()",5);
			return; 
			}
		this.mb.style.left = (c.x - (nw/2)) +"px";
		this.mb.style.top = (c.y - 20 - (this.mb.clientHeight/2))+ "px";
		}
	else {
		this.centerMe = setTimeout(this.myvar+".centerThis()",10);
		}
	};

MessageBox.prototype.showMess = function (val,temp){
	val = unescape(val);
	if(this.eraseMess){ clearTimeout(this.eraseMess); }
	if(!this.mb){ this.mb = $(this.id); }
	if(this.mb){

		this.mb.innerHTML = "<span>"+val+"</span>";

	    	if(temp){

			this.eraseMess = setTimeout(this.myvar+".hideMess();",temp);

			}

		this.mb.style.left = "-1200px";
		this.mb.style.top = "-1200px";
		this.mb.style.width = "";
		this.mb.style.height = "";
		this.centerMe = setTimeout(this.myvar+".centerThis()",5);
		this.mb.style.visibility = "visible"; 

		}

	else {  
		var d = document.createElement("div");
		d.innerHTML = val;
		d.id = this.myvar + "_message";
		d.style.position = "absolute";
		d.style.backgroundColor = this.style.backgroundColor || "silver";
		d.style.opacity = this.style.opacity || 0.80;
		d.style.filter = "alpha(opacity="+parseInt(d.style.opacity*100,10)+")";
		d.style.color = this.style.color || "black";
		d.style.padding = this.style.padding || "6px";
 		d.style.borderWidth = this.style.borderWidth || "3px";
		d.style.borderColor = this.style.borderColor || "";
		d.style.backgroundImage = this.style.backgroundImage || "";
		d.style.borderStyle = this.style.borderStyle || "outset";
		d.style.visibility = "visible";
		d.style.left = "-1200px";
		d.style.top = "-1200px";
		this.centerMe = setTimeout(this.myvar+".centerThis()",5);
	
		d.style.zIndex = 1000;
		document.body.appendChild(d);
		}
	}; 

GMap2.prototype.getObjCenter = function(){
	var obj = this.getContainer();
	var container = obj;
	var y = 0;
	var x = 0;
	if (obj.offsetParent) {
		x = obj.offsetLeft;
		y = obj.offsetTop;
		obj = obj.offsetParent;
		while (obj) {
			x += obj.offsetLeft;
			y += obj.offsetTop;
			obj = obj.offsetParent;
			}
 	return new GPoint(x+parseInt(this.getSize().width,10)/2,y+parseInt(this.getSize().height,10)/2);
	}
	
	};

GeoXml.prototype.loadJSONUrl = function (url, title, latlon, desc, idx) {
  var that = this;
  GDownloadUrl(url, function(doc) {
    	that.parseJSON(doc,title, latlon, desc, idx);
  	});
};

GeoXml.prototype.loadXMLUrl = function (url, title, latlon, desc, idx) {
var that = this;	
   that.DownloadURL(url, function(doc) {
    	that.processing(GXml.parse(doc),title, latlon, desc, idx)
  	}, title);
};

GeoXml.prototype.upgradeLayer = function(n) {
	var mt = this.map.getMapTypes();
	var found = false;
	for(var i=0;i<mt.length;i++){
		if(mt[i] == this.baseLayers[n]){
			found = true;
			this.map.removeMapType(this.baseLayers[n]);
			}
		}
	if(!found){ this.map.addMapType(this.baseLayers[n]); }
	};

GeoXml.prototype.makeWMSTileLayer = function(getmapstring, on, title, opac, attr, grouptitle, wmsbounds) {
	var that = this;
	getmapstring = getmapstring.replace("&amp;","&");
 	var args = getmapstring.split("?");
	var baseurl = args[0]+"?";
	var version = "1.1.0";
	var format = "image/png";
	var styles = "";
	var layers = "";
	var queryable = false;
	var opacity = 1.0;
	if(typeof opac!="undefined"){ opacity = opac; }
	var bbox = "-180,-90,180,90";
	var pairs = args[1].split("&");
	var sld ="";
	var servicename="";
	var atlasname="";
	var gmcrs = "";
	var epsg;
	for(var i=0;i < pairs.length; i++){
		var dstr = pairs[i];
		var duo = pairs[i].split("=");
		var dl = duo[0].toLowerCase();
		switch(dl) {
			case "version" : version = duo[1];break;
			case "bbox": bbox = duo[1]; break;
			case "width":
			case "height":break;
			case "service":break;
			case "servicename": servicename = duo[1]; break;
			case "atlasname":atlasname = duo[1];break;
			case "styles": styles = duo[1]; break;
			case "layers": layers = duo[1]; break;
			case "format": format = duo[1]; break;
			case "opacity":opacity = parseFloat(duo[1]); break;
			case "crs":
			case "srs":epsg = duo[1]; break;
			case "gmcrs":gmcrs = duo[1];break;
			case "queryable":queryable = duo[1];break;
			default : if(duo[0]){ baseurl += "&"+pairs[i]; } break;
			}
		}

	if(gmcrs) { 
		epsg = gmcrs; 
		}
	var bbn = bbox.split(",");
	var bb = {"w":parseFloat(bbn[0]),"s":parseFloat(bbn[1]),"e":parseFloat(bbn[2]),"n":parseFloat(bbn[3])};
	var lon = (bb.n - bb.s);
	var z = 0; 
	var ex = 180;

 	while(ex >= lon){
		ex = ex/2;
		z++;
		}
	z--;
	if(z<1){ z=1; }

 	if(!attr) { attr = "Base Map from OGC WMS"; }
	var cr0 = new GCopyright(1, new GLatLngBounds(new GLatLng(bb.s,bb.w),new GLatLng(bb.n,bb.e)),0,attr);
    	var cc0 = new GCopyrightCollection("");
     	cc0.addCopyright(cr0);
 	var twms = new GTileLayer(cc0,z,19);
	twms.s = bb.s; twms.n = bb.n; twms.e = bb.e; twms.w = bb.w;
	twms.myBaseURL = baseurl;
	if(servicename){
		twms.servicename = servicename;
		}
	if(atlasname){
		twms.atlasname = atlasname;
		}
	twms.publishdirectory = this.publishdirectory;
	twms.epsg = epsg;
	twms.getTileUrl = function(a,b,c) {
		if (typeof(this.myStyles)=="undefined") {
			this.myStyles=""; 
			}
		var lULP = new GPoint(a.x*256,(a.y+1)*256);
		var lLRP = new GPoint((a.x+1)*256,a.y*256);
		var lUL = G_NORMAL_MAP.getProjection().fromPixelToLatLng(lULP,b,c);
		var lLR = G_NORMAL_MAP.getProjection().fromPixelToLatLng(lLRP,b,c);
		var west = lUL.x;
		var east = lLR.x;
		var north = lUL.y;
		var south = lLR.y;
		var ge = east;
		var gw = west;
		var gs = south;
		var gn = north;
		if(gn < gs){ gs = gn; gn = south; }
		if(this.epsg != "EPSG:4326" && this.epsg != "CRS:84" && this.epsg!= "4326") {
			west = GeoXml.merc2Lon(west);
			north = GeoXml.merc2Lat(north);
			east = GeoXml.merc2Lon(east);
			south = GeoXml.merc2Lat(south);
			}
		var w = Math.abs(east - west);
		var h = Math.abs(north - south);
		var s = h/w;
 		h = Math.round((256.0 * s) + 0.5);
 
		w = 256;
		var sud = south; 
		if(north < south){
			south = north; north = sud; 
			}

		  if(gs>(this.n) || ge < (this.w) || gn < (this.s) || gw > (this.e)  ){
			var retstr = this.publishdirectory +"black.gif";
		 	}

    		var lBbox=west+","+south+","+east+","+north;
		var lSRS="EPSG:41001";
		if(typeof this.epsg != "undefined" || this.srs == "4326"){
    			lSRS=this.epsg;
			}


		var lURL=this.myBaseURL;
	
		if(typeof this.myVersion == "undefined"){ this.myVersion = "1.1.1"; }

		var ver = parseFloat(this.myVersion);
		var arcims = /arcimsproxy/i; 
		if(!this.myBaseURL.match(arcims)) {
			lURL+="&SERVICE=WMS";
			if(this.myVersion !="1.0.0"){
				lURL+="&REQUEST=GetMap";
				}
			else {
				lURL+="&REQUEST=Map";
				}
			}
		if(this.servicename){
			lURL += "?ServiceName="+this.servicename;
			}
		if(this.atlasname){
			lURL += "&AtlasName="+this.servicename;
			}
		lURL+="&VERSION="+this.myVersion;
		if(this.myLayers) {
			lURL+="&LAYERS="+this.myLayers;
			lURL+="&STYLES="+this.myStyles; 
			}
		if(this.mySLD){
			lURL+="&SLD="+this.mySLD; 
			}
  		lURL+="&FORMAT="+this.myFormat;
		lURL+="&BGCOLOR=0x000000";
		lURL+="&TRANSPARENT=TRUE";
		if(this.myVersion == "1.1.1" || ver<1.3 ){
			lURL += "&SRS=" + lSRS;
			}

		else {
			lURL += "&CRS=" + lSRS;

			}
		lURL+="&WIDTH="+w;
		lURL+="&HEIGHT="+h;
		lURL+="&BBOX="+lBbox;
		this.requestCount++;
		return lURL;
		};
	twms.myFormat = format;
	twms.myVersion = version;
	twms.myExtents = bbox;
	twms.queryable = queryable;
	twms.opacity = opacity;
	twms.getOpacity = function() { return this.opacity; };
	if(sld){
		twms.mySLD = sld;
		}
	else {
		twms.myLayers = layers;
		twms.myStyles = styles;
		}

	var ol = new GTileLayerOverlay(twms);
	ol.bounds = new GLatLngBounds();
	ol.bounds.extend(new GLatLng(bb.n,bb.e));ol.bounds.extend(new GLatLng(bb.s,bb.w));

	this.wmscount++;
 	if(this.opts.doMapTypes){
 		var twms2 = new GTileLayer(cc0,z,19);
		twms2.s = bb.s; 
		twms2.n = bb.n;
		twms2.e = bb.e;
		twms2.w = bb.w;
		twms2.myBaseURL = baseurl;
		twms2.servicename = servicename;
		twms2.publishdirectory = this.publishdirectory;
		twms2.getTileUrl = twms.getTileUrl;
		twms2.myFormat =  twms.myFormat;
		twms2.myVersion = version;
		twms2.opacity = 1.0;
		twms2.title = title;
		if(attr) {
			twms2.attribution = attr;
			}
		twms2.getOpacity = function() { return this.opacity; };
		if(sld){
			twms2.mySLD = sld;
			}
		else {
			twms2.myLayers = layers;
			twms2.myStyles = styles;
			}
		twms2.epsg = epsg;
		var base = new GTileLayer(cc0,z,19);
		base.s = bb.s; 
		base.n = bb.n;
		base.e = bb.e;
		base.w = bb.w;  
		base.dir = this.publishdirectory;
		base.getTileUrl = function () {
			return (this.dir +"black.gif");
			};
		base.opacity = 1.0;
		base.title = title;
		if(attr) {
			base.attribution = attr;
			}
		base.getOpacity = function() { return this.opacity; };
		//base,
		var layer = [twms2, G_HYBRID_MAP.getTileLayers()[1]];
		var cmap = new GMapType(layer, G_HYBRID_MAP.getProjection(), ""+title+"", G_HYBRID_MAP);
		cmap.bounds = new GLatLngBounds(new GLatLng(bb.s,bb.w),new GLatLng(bb.n,bb.e));
		if(grouptitle) { cmap.grouptitle = grouptitle; }
		that.baseLayers.push(cmap);
		that.map.addMapType(cmap);
		return null;
		}
	else { return ol; }
	};


GeoXml.SEMI_MAJOR_AXIS = 6378137.0;
GeoXml.ECCENTRICITY = 0.0818191913108718138;
GeoXml.DEG2RAD = 180.0/(Math.PI);
GeoXml.merc2Lon = function(lon) {
	return (lon*GeoXml.DEG2RAD)*GeoXml.SEMI_MAJOR_AXIS;
	};

GeoXml.merc2Lat = function(lat) {
	var rad = lat * GeoXml.DEG2RAD;
	var sinrad = Math.sin(rad);
	return (GeoXml.SEMI_MAJOR_AXIS * Math.log(Math.tan((rad + Math.PI/2) / 2) * Math.pow(((1 - GeoXml.ECCENTRICITY * sinrad) / (1 + GeoXml.ECCENTRICITY * sinrad)), (GeoXml.ECCENTRICITY/2))));

	};


GeoXml.prototype.toggleLabels = function(on) {
	if(!on) {this.removeLabels();
		}
	else { 
	  	this.addLabels();
		}
	};
GeoXml.prototype.addLabels = function() {
	this.labels.onMap = true;
 	this.map.addOverlay(this.labels); 
	};
 
GeoXml.prototype.removeLabels = function() {
	this.labels.onMap = false;
	this.map.removeOverlay(this.labels);
	};

var useLegacyLocalLoad = true;

GeoXml.prototype.DownloadURL = function (fpath,callback,title){
	if(!fpath){ return; }
	var xmlDoc;
	var that=this;
	var cmlurl = fpath;
	
    if (!top.standalone && this.proxy) {
        cmlurl = this.proxy + "url=" + escape(cmlurl);
        }


    if (top.standalone || useLegacyLocalLoad) {
        if (cmlurl.substring(2, 3) == ":") {
            xmlDoc = new ActiveXObject("Msxml2.DOMDocument.4.0");
            xmlDoc.validateOnParse = false;
            xmlDoc.async = true;
            xmlDoc.load(cmlurl);
            if (xmlDoc.parseError.errorCode != 0) {
                var myErr = xmlDoc.parseError;
                alert ("GeoXml file appears incorrect\n" + myErr.reason + " at line:" + myErr.line );
                }
            else {
		callback(xmlDoc.doc);
                }
            return;
            }
        }
    var cmlreq;
    /*@cc_on @*/
    /*@if(@_jscript_version>=5)
    try{
    cmlreq=new ActiveXObject("Msxml2.XMLHTTP");
    }catch(e){
    try{
    cmlreq=new ActiveXObject("Microsoft.XMLHTTP");
    }catch(E){
    alert("attempting xmlhttp");
    cmlreq=false;
    }
    }
    @end @*/
    if (! cmlreq && typeof XMLHttpRequest != 'undefined') {
        cmlreq = new XMLHttpRequest();
        }
    else {
        if (typeof ActiveXObject != "undefined") {
            cmlreq = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }

    var here = cmlurl;
    if(cmlreq.overrideMimeType) { cmlreq.overrideMimeType("text/xml"); }
    cmlreq.open("GET", here, true);
    cmlreq.onreadystatechange = function () {
        switch (cmlreq.readyState) {
            case 4:
                that.mb.showMess(title+" received", 2000);
                if (typeof ActiveXObject != "undefined") {
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = "false";
                    var response = cmlreq.responseText;
		    callback(response);
                    }
                else {
                    if (cmlreq.responseXML) {
                       that.mb.showMess(title+" received", 2000);
                        callback(cmlreq.responseText);
                        }
                    else {
 			      if (cmlreq.status == 200) {
                       	 	var resp = cmlreq.responseText;
                      		var sresp = resp.substring(0, 400);
                        	var isXML = resp.substring(0, 5);
                        	if (isXML == "<?xml" && sresp.indexOf("kml")!=-1) {
                                     that.mb.showMess(title+" response received", 2000);
				     callback(resp.responseText);
                                    }
				else {
					that.mb.showMess("File does not appear to be a valid GeoData"+resp,6000);
					}
                            	}
			}
                    }
                break;
            case 3:
                that.mb.showMess("Receiving "+title+"...");
                break;
            case 2:
                that.mb.showMess("Waiting for "+title,2000);
                break;
            case 1:
                that.mb.showMess("Sent request for "+title,2000);
                break;
            }
        };

    try {
        cmlreq.send(null);
        }
    catch (err) {
        if (cmlurl.substring(2, 3) == ":" && ! useLegacyLocalLoad) {
            useLegacyLocalLoad = true;
            this.DownloadURL(cmlurl);
            }
        }

};
