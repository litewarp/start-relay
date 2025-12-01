/**
 * @generated SignedSource<<7ad9f2a411e07529f4eb2a7d96096ac1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type relayPageQuery$variables = Record<PropertyKey, never>;
export type relayPageQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"relayFastFragment" | "relayFragment">;
};
export type relayPageQuery = {
  response: relayPageQuery$data;
  variables: relayPageQuery$variables;
};

const node: ConcreteRequest = {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "relayPageQuery",
    "selections": [
      {
        "args": null,
        "kind": "FragmentSpread",
        "name": "relayFastFragment"
      },
      {
        "kind": "Defer",
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "relayFragment"
          }
        ]
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "relayPageQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fastField",
        "storageKey": null
      },
      {
        "if": null,
        "kind": "Defer",
        "label": "relayPageQuery$defer$relayFragment",
        "selections": [
          {
            "alias": null,
            "args": [
              {
                "kind": "Literal",
                "name": "waitFor",
                "value": 5000
              }
            ],
            "kind": "ScalarField",
            "name": "slowField",
            "storageKey": "slowField(waitFor:5000)"
          }
        ]
      }
    ]
  },
  "params": {
    "cacheID": "778bbbd29870a8cd22d990c0386eba10",
    "id": null,
    "metadata": {},
    "name": "relayPageQuery",
    "operationKind": "query",
    "text": "query relayPageQuery {\n  ...relayFastFragment\n  ...relayFragment @defer(label: \"relayPageQuery$defer$relayFragment\", if: true)\n}\n\nfragment relayFastFragment on Query {\n  fastField\n}\n\nfragment relayFragment on Query {\n  slowField(waitFor: 5000)\n}\n"
  }
};

(node as any).hash = "2c16f16b8d97c124d5739419181c2b9a";

export default node;
