chrome.storage.local.get("auth_token",function (object) { auth_token = object["auth_token"];
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
				}
			}
		});
	}
});
		