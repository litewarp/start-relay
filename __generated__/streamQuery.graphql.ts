/**
 * @generated SignedSource<<6d60b059d4d908c10e84ff76615da65e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type streamQuery$variables = Record<PropertyKey, never>;
export type streamQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"streamAlphabet_Query">;
};
export type streamQuery = {
  response: streamQuery$data;
  variables: streamQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "kind": "Literal",
    "name": "first",
    "value": 10
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "streamQuery",
    "selections": [
      {
        "args": null,
        "kind": "FragmentSpread",
        "name": "streamAlphabet_Query"
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "streamQuery",
    "selections": [
      {
        "alias": null,
        "args": (v0/*: any*/),
        "concreteType": "AlphabetConnection",
        "kind": "LinkedField",
        "name": "alphabet",
        "plural": false,
        "selections": [
          {
            "if": null,
            "kind": "Stream",
            "label": "streamAlphabet_Query$stream$stream_alphabet",
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "AlphabetEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "cursor",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Alphabet",
                    "kind": "LinkedField",
                    "name": "node",
                    "plural": false,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "kind": "ScalarField",
                        "name": "id",
                        "storageKey": null
                      },
                      {
                        "alias": null,
                        "args": null,
                        "kind": "ScalarField",
                        "name": "letter",
                        "storageKey": null
                      },
                      {
                        "alias": null,
                        "args": null,
                        "kind": "ScalarField",
                        "name": "__typename",
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ]
          },
          {
            "if": null,
            "kind": "Defer",
            "label": "streamAlphabet_Query$defer$stream_alphabet$pageInfo",
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "PageInfo",
                "kind": "LinkedField",
                "name": "pageInfo",
                "plural": false,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "endCursor",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "hasNextPage",
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ]
          }
        ],
        "storageKey": "alphabet(first:10)"
      },
      {
        "alias": null,
        "args": (v0/*: any*/),
        "filters": null,
        "handle": "connection",
        "key": "stream_alphabet",
        "kind": "LinkedHandle",
        "name": "alphabet"
      }
    ]
  },
  "params": {
    "cacheID": "d6e1a7c2b01f2f0e359f0be21522e0f4",
    "id": null,
    "metadata": {},
    "name": "streamQuery",
    "operationKind": "query",
    "text": "query streamQuery {\n  ...streamAlphabet_Query\n}\n\nfragment streamAlphabet_Query on Query {\n  alphabet(first: 10) {\n    edges @stream(label: \"streamAlphabet_Query$stream$stream_alphabet\", initialCount: 0) {\n      cursor\n      node {\n        id\n        letter\n        __typename\n      }\n    }\n    ... @defer(label: \"streamAlphabet_Query$defer$stream_alphabet$pageInfo\") {\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3858824dd0607a5a8d5811f11906a6ff";

export default node;
