/**
 * @generated SignedSource<<ed3632dfc84f406859ba16f831de8641>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type streamQuery$variables = {
  count: number;
  cursor?: string | null | undefined;
};
export type streamQuery$data = {
  readonly alphabet: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly " $fragmentSpreads": FragmentRefs<"LetterFragment">;
    } | null | undefined> | null | undefined;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  } | null | undefined;
};
export type streamQuery = {
  response: streamQuery$data;
  variables: streamQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "count"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "cursor"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cursor",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "__typename",
  "storageKey": null
},
v3 = [
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
        "name": "hasNextPage",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "endCursor",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
],
v4 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "cursor"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "streamQuery",
    "selections": [
      {
        "alias": "alphabet",
        "args": null,
        "concreteType": "AlphabetConnection",
        "kind": "LinkedField",
        "name": "__stream_alphabet_connection",
        "plural": false,
        "selections": [
          {
            "kind": "Stream",
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "AlphabetEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  (v1/*: any*/),
                  {
                    "args": null,
                    "kind": "FragmentSpread",
                    "name": "LetterFragment"
                  },
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Alphabet",
                    "kind": "LinkedField",
                    "name": "node",
                    "plural": false,
                    "selections": [
                      (v2/*: any*/)
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ]
          },
          {
            "kind": "Defer",
            "selections": (v3/*: any*/)
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "streamQuery",
    "selections": [
      {
        "alias": null,
        "args": (v4/*: any*/),
        "concreteType": "AlphabetConnection",
        "kind": "LinkedField",
        "name": "alphabet",
        "plural": false,
        "selections": [
          {
            "if": null,
            "kind": "Stream",
            "label": "streamQuery$stream$stream_alphabet",
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "AlphabetEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  (v1/*: any*/),
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
                      (v2/*: any*/)
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
            "label": "streamQuery$defer$stream_alphabet$pageInfo",
            "selections": (v3/*: any*/)
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": (v4/*: any*/),
        "filters": null,
        "handle": "connection",
        "key": "stream_alphabet",
        "kind": "LinkedHandle",
        "name": "alphabet"
      }
    ]
  },
  "params": {
    "cacheID": "b776687a1fa906239947ee0305a10af8",
    "id": null,
    "metadata": {
      "connection": [
        {
          "count": "count",
          "cursor": "cursor",
          "direction": "forward",
          "path": [
            "alphabet"
          ],
          "stream": true
        }
      ]
    },
    "name": "streamQuery",
    "operationKind": "query",
    "text": "query streamQuery(\n  $count: Int!\n  $cursor: String\n) {\n  alphabet(first: $count, after: $cursor) {\n    edges @stream(label: \"streamQuery$stream$stream_alphabet\", initialCount: 2) {\n      cursor\n      ...LetterFragment\n      node {\n        __typename\n        id\n      }\n    }\n    ... @defer(label: \"streamQuery$defer$stream_alphabet$pageInfo\") {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n}\n\nfragment LetterFragment on AlphabetEdge {\n  node {\n    id\n    letter\n  }\n}\n"
  }
};
})();

(node as any).hash = "191e8adec76f75b86676b0229f1093d8";

export default node;
