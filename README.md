# Tanstack Start Relay Starter

Check out `/src/lib/relay`

The `/src/lib/fetch-multipart` package is slightly modified version of `fetch-multipart-graphql` which has problems with commonjs exports / typings and a few spec-related issues. 

The fetch function uses a transformer to properly parse and format the incremental payloads. It is based on the [example here by robrichard](https://github.com/robrichard/defer-relay-example/blob/main/client/fetchGraphQL.ts). You can find it in `/src/lib/relay/transformer.ts`

There is one open issue with the incremental transformer, both of which are mismatches between the graphql spec and relay's. Right now you get two Relay warnings:

1. Relay does not currently allow missing fields from defer payloads. 

```
Warning: RelayResponseNormalizer: Payload did not contain a value for field `fastField: fastField`. Check that you are parsing with the same query that was used to fetch the payload.
```

This is a [known issue](https://github.com/facebook/relay/issues/5081#issuecomment-3335575472) and there is a [fix in place](https://github.com/facebook/relay/pull/5083). 
