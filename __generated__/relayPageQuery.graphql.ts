/**
 * @generated SignedSource<<ea6f74f9c17210e158bac783c4f22d5d>>
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
  readonly fastField: string;
  readonly " $fragmentSpreads": FragmentRefs<"relayFragment">;
};
export type relayPageQuery = {
  response: relayPageQuery$data;
  variables: relayPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "fastField",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "relayPageQuery",
    "selections": [
      (v0/*: any*/),
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
      (v0/*: any*/),
      {
        "if": null,
        "kind": "Defer",
        "label": "relayPageQuery$defer$relayFragment",
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "slowField",
            "storageKey": null
          }
        ]
      }
    ]
  },
  "params": {
    "cacheID": "5b9db63b8117fe989890fd3e2d93b232",
    "id": null,
    "metadata": {},
    "name": "relayPageQuery",
    "operationKind": "query",
    "text": "query relayPageQuery {\n  fastField\n  ...relayFragment @defer(label: \"relayPageQuery$defer$relayFragment\", if: true)\n}\n\nfragment relayFragment on Query {\n  slowField\n}\n"
  }
};
})();

(node as any).hash = "39dcb7cb0e29a1c258e6ba4b6aed586b";

export default node;
