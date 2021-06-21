<noinclude>{{doc/start}}
To use, create a sub-page from the template called '''doc''', put {{tl|doc/start}} at the start of your documentation, and {{tl|doc/end}} at the end.

Go back to your main template page and put &lt;noinclude&gt;{{tl|doc}}&lt;/noinclude&gt; on a newline after the end of the template. /doc pages will automatically be added to [[:Category:Documentation templates]].

== Optional parameters ==
=== clear ===
If your main template page has floating content and you would like to stop it going over the documentation, put {{tlx|doc/start|clear}} instead of {{tl|doc/start}} on your documentation page.<br>
This is also useful for templates not using &lt;includeonly&gt;, as it will put some space between the template and the documentation box.

=== nodoc=1 ===
If a template has no documentation and you don't know how to use it, put {{tlx|doc/start|nodoc{{=}}1}} (or if the template needs clear as well, {{tlx|doc/start|clear|nodoc{{=}}1}}) instead of {{tl|doc/start}} on your documentation page.<br>
The documentation's background will become red to make it more noticeable, and the page will be added to [[:Category:Templates with no documentation]].

=== baddoc=1 ===
Similar to nodoc, this is used to mark templates that '''do''' have documentation, but it isn't very good. This can mean it doesn't have enough examples, doesn't explain all the functions properly, or doesn't explain the point of the template properly.<br>
The documentation's background will become yellow to make it more noticeable, and the page will be added to [[:Category:Templates with bad documentation]].

If both nodoc and baddoc are specified, baddoc will be ignored.
</div>

[[Category:Documentation templates| ]]
</noinclude><includeonly>{{/doc}}</includeonly>