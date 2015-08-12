{var s = document.createElement('script');
s.src = chrome.extension.getURL('injections.js');
s.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head||document.documentElement).appendChild(s);
}
{var s = document.createElement('script');
s.src = chrome.extension.getURL('jquery-1.11.3.min.js');
s.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head||document.documentElement).appendChild(s);
}

// APPLIES

var opacityLevelBad = 0.2;
function applyElementRate( element, rate, reason )
{
	needProcess = false;
	color = "#FFFFFF";
	opacity = 1.0;
	if( rate >= 80 )
	{
		color = "#F0FFF0";
		opacity = 1.0;
	}
	if( rate < 20 && rate > -20 )
	{
		color = "#FFFFD0";
		opacity = 0.9;
	}
	if( rate <= -20 && rate > -60)
	{
		color = "#FFE0E0";
		opacity = 0.7;
	}
	if( rate <= -60 )
	{
		color = "#FFA0A0";
		opacity = 0.3;
	}
	if( rate <= 20 || rate >= 80 )
	{
		needProcess = true;
	}
	if( needProcess ) 
	{
		element.style.background = color;
		if( reason )
			$(element).attr( "title", reason );
		$(element).children().each( function( index ) { this.style.opacity = opacity });
	}
}

// PROCESS

function checkAll()
{
	url = window.location.href;
	
	//injects
	Object.keys(injectionsMap).forEach(function(urlPattern){
		selectorsMap = injectionsMap[urlPattern];
		if( url.match( urlPattern ) )
		{
			Object.keys(selectorsMap).forEach(function(selector){
				func = selectorsMap[selector];
				$( selector ).each(function() {
					if( this.socialfilter_injected )
						return;
		
					var obj = func( this );
				
					this.socialfilter_injected = true;
				});
			});
		}
	});
	
	objects = [];
	Object.keys(checkMap).forEach(function(urlPattern){
		selectorsMap = checkMap[urlPattern];
		if( url.match( urlPattern ) )
		{
			Object.keys(selectorsMap).forEach(function(selector){
				func = selectorsMap[selector];
				$( selector ).each(function() {
					if( this.socialfilter_processed )
					{
						return;
					}
					
					var obj = func( this );
					
					if( obj !== null && obj !== undefined )
					{
						objects.push( obj );
						this.socialfilter_processed = true;
					}						
					
				});
			});
		}
	});
	
	// offline update 
	objectsRated = rateOfflineAll( objects );
	objectsRated.offline.forEach( function( obj ) { 
		applyElementRate( obj.element, obj.rate, obj.reason );
	});
	
	requestData = [];
	objectsRated.online.forEach( function( obj ) { 
		requestData.push( obj );
	});
	
	if( requestData.length > 0 )
	{	
		requestRates( requestData, objectsRated );
	};
}

function requestRates( request, objectsRated )
{
	chrome.storage.local.get("auth_token",function (object) {
		auth_token = object["auth_token"];
		$.ajax({
				type: "POST",
				url: "https://socialfilter.ru/plugin/api/0.1/get_rates",
				data: "request=" + JSON.stringify( request ) + "&auth_token=" + auth_token,
				success: function( resp ){
					var dataRates = resp;
					dataRates.forEach( function( dataForItem, index ) { 
						var rate = dataForItem.rate;
						var reason = dataForItem.reason;
						applyElementRate( objectsRated.online[ index ].element, rate, reason );
					});
				}
		})
	});
}
// INJECTS

var injectionsMap = {};

injectionsMap[":\/\/vk\.com\/"] = 
{
	// delete button
	".post_delete_button,.reply_delete_button" : function ( obj )
	{
		var oldOnClick = $( obj ).attr("onclick");
		var reSpam = /^wall\.markAsSpam\('(\d*_\d*)', '.*'\);?$/;
		if( oldOnClick.match( reSpam ) )
		{
			var post_id = oldOnClick.replace(reSpam, "$1");
			var newOnClick = "socialfilter_markPostAsSpam( 'vk', '" + post_id + "', '" + auth_token + "' ); "+ oldOnClick;
			$( obj ).attr("onclick", newOnClick );
		}
	}
}

// CHECKS

var checkMap = {};

checkMap[":\/\/vk\.com\/"] = 
{
	// disqussions
	".bp_table" : function ( obj )
	{
		var re = /\/(.*)/;
		var author_element = $( obj ).find( ".bp_thumb" );
		var str = author_element.attr("href");
		var login = str.replace( re, "$1" );
		var ret = {
			element : obj,
			sn: "vk",
			author : 
			{
				login : login,
				img : $( obj ).find(".bp_thumb").children("img").attr("src")
			}
		};
		reId = /^id(\d*)$/;
		if( login.match( reId ) )
		{
			id = login.replace( reId, "$1" );
			ret.author.id = id;
		}
		return ret;
	},
	".user_block" : function( obj )
	{
		var re = /user_block(\d*)/;
		var str = $( obj ).attr("id");
		var id = parseInt( str.replace(re, "$1") );
		
		var ret = {
			element : obj,
			sn: "vk",
			author : 
			{
				id : id,
				img : $( obj ).children("div").children("a").children("img").attr("src")
			}
		};
		return ret;
	},
	// comments
	".reply_table" : function( obj ) {
		var ret = {
				element : obj,
				sn: "vk",
				author : 
				{
					id : $( obj ).children("div").children(".reply_text").children("a").attr("data-from-id"),
					img : $( obj ).children(".reply_image").children("img").attr("src")
				}
			};
		return ret;
	},
	".post_table" : function( obj ) {
		var icon = $( obj ).children(".post_image").children(".post_image");
		var re = /\/id(\d*)/;
		var id = $( obj ).find( ".author" ).attr("data-from-id");
		var ret = {
				element : obj,
				sn: "vk",
				author : 
				{
					id : id,
					img : icon.children("img").attr("src")
				}
			};
		return ret;
	},
	".fans_fan_row" : function( obj ) {
		var re = /fans_fan_row(\d*)/;
		var str = $( obj ).attr("id");
		var id = parseInt( str.replace(re, "$1") );
		var ret = {
				element : obj,
				sn: "vk",
				author : 
				{
					id : id,
					img : $( obj ).children("div").children("a").children("img").attr("src")
				}
			}
		
		return ret;
	},	
	"a" : function( obj ) {
		var re = /^\/id(\d*)$/;
		var str = $( obj ).attr("href");
		if( str && str.match( re ) )
		{
			var id = parseInt( str.replace(re, "$1") );
			var ret = {
				element : obj,
				sn: "vk",
				author : 
				{
					id : id,
				}
			}
		
			return ret;
		}
		return null;
	},
	"#header" : function( obj ) {
		var re = /https*:\/\/vk\.com\/id(\d*)$/;
		var str = window.location.href;
		if( str && str.match( re ) )
		{
			var id = parseInt( str.replace(re, "$1") );
			var ret = {
				element : obj,
				sn: "vk",
				author : 
				{
					id : id
				}
			}
		
			return ret;
		}
		return null;
	}
	
};

checkMap["\.livejournal\.com\/"] = {
	".comment,.comment-wrap" : function( obj ) {
		var ret = {
				element : obj,
				sn: "lj",
				author : {
					login : $( obj ).find(".ljuser").attr("lj:user")
				}
			};
		return ret;
	}
};


checkMap[".*"] = {
	"a" : function( obj ) {
		var re = /https*:\/\/vk\.com\/id(\d*)/;
		var str = $( obj ).attr("href");
		if( str && str.match( re ) )
		{
			var id1 = parseInt( str.replace(re, "$1") );
			if( id1 )
			{
				var ret = {
					element : obj,
					sn: "vk",
					author : 
					{
						id : id1
					}
				}	
				return ret;
			}
		}
		return null;
	}
};


checkMap[":\/\/twitter\.com\/"] = {
	".content" : function( obj ) {
		
		var author_elem = $( obj ).find(".account-group");
		var ret = {
				element : obj,
				sn: "twitter",
				author : {
					id : author_elem.attr("data-user-id"),
					login : author_elem.find(".username").find("b").text()
				}
			}

		return ret;
	}
};
	
	
checkMap[":\/\/blogs\.yandex\.ru\/"] = {
	".b-item" : function( obj ) {
		var url = $( obj ).find(".SearchStatistics-link").attr("href");
		if( url && url.match(/:\/\/vk\.com\//) )
		{
		
			var reId = /https?:\/\/vk\.com\/id(\d*)/;
			var str = $( obj ).find(".b-hlist").find(".SearchStatistics-username").attr("href");
			var reLogin = /https?:\/\/vk\.com\/(.*)/;
			
			var id = parseInt( str.replace(reId, "$1") );
			if( id )
			{
				var ret = {
					element : obj,
					sn: "vk",
					author : 
					{
						id : id
					}
				}
				return ret;
			}
			else
			{
				var login = str.replace(reLogin, "$1");
				if( login )
				{
					var ret = {
						element : obj,
						sn: "vk",
						author : 
						{
							login : login
						}
					}
					return ret;
				}
			
			}
		}
		
		if( url && url.match(/\.livejournal\.com\//) )
		{
			var re = /https?:\/\/(.*)\.livejournal.com/;
			var str = $( obj ).find(".b-hlist").find(".SearchStatistics-username").attr("href");
			var login = str.replace(re, "$1");
			
			if( login )
			{
				var ret = {
					element : obj,
					sn: "lj",
					author : 
					{
						login : login
					}
				}
				return ret;
			}
		}
		
		urlTwitter = $( obj ).find(".SearchStatistics-twitter-item").attr("href");
		if( urlTwitter )
		{
		
			var re = /https?:\/\/vk\.com\/id(\d*)/;
			var login = $( obj ).find(".b-hlist__name").text();
			if( login )
			{
				var ret = {
					element : obj,
					sn: "twitter",
					author : 
					{
						login : login
					}
				}
				return ret;
			}
		}
	}
};

 // RATES
 
 
 
 
 function rateOfflineAll( objects )
{
	result = {
			online : [],
			offline : []
	};
	objects.forEach( function( obj ) { 
		
		if( obj.sn == "vk" )
			rate = rateOfflineVK( obj );

		if( obj.sn == "lj" )
			rate = rateOfflineLJ( obj );
		
		if( obj.sn == "twitter" )
			rate = rateOfflineTwitter( obj );
		
		if( rate === null )
		{
			result.online.push( obj );
		}
		else
		{
			obj.rate = rate.rate;
			obj.reason = rate.reason;
			result.offline.push( obj );
		}
	});
	
	return result;
}

function rateOfflineVK( obj )
{
	var m = 101;
	if( obj.author.img )
	{
		var img = obj.author.img;
		var reDeactivated = /\/images\/deactivated_\d*\.png/;
		var reCamera = /\/images\/camera_\d*\.png/;
		
		var is_deactivated = img.match( reDeactivated );
		var is_camera = img.match( reCamera );
		
		if( is_camera )
		{
			m = Math.min( m, -10 );
			r = "Аккаунт без аватарки";
		}
		if( is_deactivated )
		{
			m = Math.min( m, -100 );
			r = "Удаленный аккаунт";
		}			
	}
	if( m <= 100 )
		return {
			rate: m,
			reason: r
		};
	else
		return null;
}

function rateOfflineLJ( obj )
{
	return null;
}

function rateOfflineTwitter( obj )
{
	var m = 101;
	if( obj.author.login )
	{
		return 50;
	}
	
	return null;
}


(new MutationObserver(function(mutations, observer) {
    mutations.forEach(function(mutation) {
		checkAll();
    });
  })).observe(document.getElementsByTagName("body")[0], {
    childList: true,
    subtree: true
  });

var auth_token = null;
chrome.storage.local.get("auth_token",function (object) {
	auth_token = object["auth_token"];
	if( ! auth_token )
	{
		$.ajax({
			type: "GET",
			url: "https://socialfilter.ru/plugin/api/0.1/get_auth_token",
			success: function( resp ){
				var tokenArr = resp;
				var authToken = tokenArr["token"];
				if( authToken )
				{
					chrome.storage.local.set({"auth_token":authToken},function () {});
					checkAll();
				}
			}
		});
	}
	else
	{
		checkAll();
	}
});
