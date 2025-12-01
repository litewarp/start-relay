user makes request to page

the preload function is called

the server starts the fetch to ssr the page

we intercept the request and pipe it to a stream

we send that stream to the client using the data transport

the page is ssr rendered and sent to the client

the client hydrates the ssr page

the client data transport receives the stream and creates a replaysubject

when the fetch occurs client side, we intercept it and return the replaysubject
