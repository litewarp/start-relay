/**
 * @generated SignedSource<<51d051420c05efe11cf6c57128f10925>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type deferPageQuery$variables = Record<PropertyKey, never>;
export type deferPageQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"deferFastFragment" | "deferSlowFragment">;
};
export type deferPageQuery = {
  response: deferPageQuery$data;
  variables: deferPageQuery$variables;
};

const node: ConcreteRequest = {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "deferPageQuery",
    "selections": [
      {
        "args": null,
        "kind": "FragmentSpread",
        "name": "deferFastFragment"
      },
      {
        "kind": "Defer",
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "deferSlowFragment"
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
    "name": "deferPageQuery",
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
        "label": "deferPageQuery$defer$deferSlowFragment",
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
    "cacheID": "f104fda8dcbbc4e6f93a4fde4379b4e4",
    "id": null,
    "metadata": {},
    "name": "deferPageQuery",
    "operationKind": "query",
    "text": "query deferPageQuery {\n  ...deferFastFragment\n  ...deferSlowFragment @defer(label: \"deferPageQuery$defer$deferSlowFragment\", if: true)\n}\n\nfragment deferFastFragment on Query {\n  fastField\n}\n\nfragment deferSlowFragment on Query {\n  slowField(waitFor: 5000)\n}\n"
  }
};

(node as any).hash = "6fe5c04fba0a181250c8df9fac091197";

export default node;
