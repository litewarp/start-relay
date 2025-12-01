/**
 * @generated SignedSource<<019859a147785cbe0f8f85908a5f729d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type deferSlowFragment$data = {
  readonly slowField: string;
  readonly " $fragmentType": "deferSlowFragment";
};
export type deferSlowFragment$key = {
  readonly " $data"?: deferSlowFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"deferSlowFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "deferSlowFragment",
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
  ],
  "type": "Query",
  "abstractKey": null
};

(node as any).hash = "76ffdaef4e904bed47a6fb64d858ae1d";

export default node;
