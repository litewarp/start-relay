# Tanstack Start Relay Starter

Check out `/src/lib/relay`

The `/src/lib/fetch-multipart` package is just a typed version of `fetch-multipart-graphql`. Will likely remove it and rely on the published package eventually.

The fetch function uses a transformer to properly parse and format the incremental payloads. It is based on the [example here by robrichard](https://github.com/robrichard/defer-relay-example/blob/main/client/fetchGraphQL.ts). You can find it in `/src/lib/relay/transformer.ts`

There are two open issues with the incremental transformer, both of which are mismatches between the graphql spec and relay's. Right now you get two Relay warnings:

1. Relay does not currently allow missing fields from defer payloads.

```
Warning: RelayResponseNormalizer: Payload did not contain a value for field `fastField: fastField`. Check that you are parsing with the same query that was used to fetch the payload.
```

This is a [known issue](https://github.com/facebook/relay/issues/5081#issuecomment-3335575472) and there is a [fix in place](https://github.com/facebook/relay/pull/5083).

2. Formatting the incremental streams pushed through the router

```
Warning: RelayModernEnvironment: Operation `relayPageQuery` contains @defer/@stream directives but was executed in non-streaming mode. See https://fburl.com/relay-incremental-delivery-non-streaming-warning.
```

The warning arises from the [`OperationExecutor.js`](https://github.com/facebook/relay/blob/bac932fb74ee66cd044d30e0256d58aaa6a496be/packages/relay-runtime/store/OperationExecutor.js#L959) code. Specifically, the warning arises here:

```ts
        if (this._isClientPayload || this._state === 'loading_final') {
          // The query has defer/stream selections that are enabled, but either
          // the server indicated that this is a "final" payload: no incremental
          // payloads will be delivered, then warn that the query was (likely)
          // executed on the server in non-streaming mode, with incremental
          // delivery disabled; or this is a client payload, and there will be
          // no incremental payload.
          warning(
            this._isClientPayload,
            'RelayModernEnvironment: Operation `%s` contains @defer/@stream ' +
              'directives but was executed in non-streaming mode. See ' +
              'https://fburl.com/relay-incremental-delivery-non-streaming-warning.',
            this._operation.request.node.params.name,
          );
          // But eagerly process any deferred payloads
          const relayPayloads = [];

```

Fix will be to format the responses before pushing them to the `RelayReplaySubject`, likely in the [transformer](https://github.com/litewarp/start-relay/blob/main/src/lib/relay/transformer.ts). Need to investigate further.
