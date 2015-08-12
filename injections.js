function socialfilter_markPostAsSpam( sn, postId, token )
{
	$.ajax({
		type: "POST",
		url: "https://socialfilter.ru/plugin/api/0.1/mark_post_as_spam",
		data: "sn=" + sn + "&post_id=" + postId + "&auth_token=" + token
	});
}
